// Persistent sidecar for offline TTS (voxforge-neural.py, JSON-lines over stdio).
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);
static SESSION: Mutex<Option<Session>> = Mutex::new(None);
static TTS_CHARS: AtomicU64 = AtomicU64::new(0);
static TTS_QUOTA_ERR: Mutex<String> = Mutex::new(String::new());

struct Session {
    dir: PathBuf,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

fn lock() -> std::sync::MutexGuard<'static, Option<Session>> {
    SESSION.lock().unwrap_or_else(|e| e.into_inner())
}

#[cfg(target_os = "windows")]
fn python_bin(dir: &Path) -> std::path::PathBuf { dir.join("resources/python/python.exe") }
#[cfg(not(target_os = "windows"))]
fn python_bin(_dir: &Path) -> std::path::PathBuf { std::path::PathBuf::from("python3") }

fn spawn(dir: &Path) -> Result<Session, String> {
    let python = python_bin(dir);
    let script = dir.join("resources/voxforge-neural.py");
    if !script.is_file() { return Err("TTS não encontrado.".into()); }
    let mut cmd = Command::new(python);
    crate::no_window(&mut cmd);
    let mut child = cmd.arg(script)
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null())
        .spawn().map_err(|e| e.to_string())?;
    let stdin = child.stdin.take().ok_or("stdin indisponível")?;
    let stdout = BufReader::new(child.stdout.take().ok_or("stdout indisponível")?);
    Ok(Session { dir: dir.to_path_buf(), child, stdin, stdout })
}

fn get(dir: &Path) -> Result<std::sync::MutexGuard<'static, Option<Session>>, String> {
    let mut guard = lock();
    let dead = match guard.as_mut() {
        None => true,
        Some(s) => s.dir != dir || s.child.try_wait().map_err(|e| e.to_string())?.is_some(),
    };
    if dead {
        if let Some(old) = guard.as_mut() { let _ = old.child.kill(); }
        *guard = Some(spawn(dir)?);
    }
    Ok(guard)
}

fn request(s: &mut Session, mut payload: Value) -> Result<Value, String> {
    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    payload["id"] = json!(id);
    let mut line = payload.to_string();
    line.push('\n');
    s.stdin.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    s.stdin.flush().map_err(|e| e.to_string())?;
    loop {
        let mut text = String::new();
        if s.stdout.read_line(&mut text).map_err(|e| e.to_string())? == 0 { return Err("TTS encerrou.".into()); }
        let v: Value = serde_json::from_str(text.trim()).map_err(|e| e.to_string())?;
        if v.get("id").and_then(Value::as_u64) == Some(id) { return Ok(v); }
    }
}

// The voices command returns IDs like "neural:pf_dora", but speak() needs the bare Kokoro ID.
fn clean_voice(v: &str) -> &str {
    v.trim().strip_prefix("neural:").unwrap_or(v.trim())
}

fn lang_for(voice: &str, lang: &str) -> String {
    let voice = clean_voice(voice);
    // The voice ID carries the real language (pf_dora, af_nicole, am_eric, jf_alpha...).
    // React to its prefix first; the caller's lang is only a fallback.
    let prefix = voice.split('_').next().unwrap_or("").to_ascii_lowercase();
    let detected = match prefix.chars().next().unwrap_or(' ') {
        'a' => Some("en-us"), 'b' => Some("en-gb"), 'p' => Some("pt-br"),
        'j' => Some("ja"), 'e' => Some("es"), 'f' => Some("fr-fr"),
        'h' => Some("hi"), 'i' => Some("it"), 'z' => Some("zh"),
        _ => None,
    };
    if let Some(value) = detected { return value.to_string(); }
    if !lang.trim().is_empty() { return lang.to_string(); }
    "pt-br".to_string()
}

pub fn voices(dir: &Path) -> Result<Value, String> {
    let mut g = get(dir)?;
    let s = g.as_mut().ok_or("TTS indisponível")?;
    let res = request(s, json!({ "cmd": "voices" }))?;
    let list = res.get("voices").cloned().unwrap_or(res);
    if !list.is_array() { return Ok(list); }
    let cleaned: Vec<Value> = list.as_array().unwrap().iter().map(|v| {
        if let Some(id) = v.as_str() {
            Value::String(clean_voice(id).to_string())
        } else if v.is_object() {
            let mut item = v.clone();
            let id = item.get("id").and_then(Value::as_str).map(clean_voice).unwrap_or("").to_string();
            if !id.is_empty() {
                item["id"] = json!(id);
                let missing_lang = item.get("lang").and_then(Value::as_str).map_or(true, |l| l.trim().is_empty());
                if missing_lang { item["lang"] = json!(lang_for(&id, "")); }
            }
            item
        } else { v.clone() }
    }).collect();
    Ok(Value::Array(cleaned))
}

// Reticences and dashes become real silences so the calm persona sounds pensive, not rushed.
fn segments_for(text: &str, speed: f32) -> Value {
    let mut out: Vec<Value> = Vec::new();
    let mut rest = text.trim();
    while !rest.is_empty() {
        let dots = rest.find("...");
        let dash = rest.find('—').or_else(|| rest.find('–'));
        let (at, silence, len) = match (dots, dash) {
            (Some(a), Some(b)) if a <= b => (a, 320, 3),
            (Some(_), Some(b)) => {
                let ch = rest[b..].chars().next().unwrap();
                (b, 220, ch.len_utf8())
            }
            (Some(a), None) => (a, 320, 3),
            (None, Some(b)) => {
                let ch = rest[b..].chars().next().unwrap();
                (b, 220, ch.len_utf8())
            }
            (None, None) => {
                out.push(json!({ "text": rest, "speed": speed, "gain": 1.0 }));
                break;
            }
        };
        let chunk = rest[..at].trim();
        if !chunk.is_empty() {
            out.push(json!({ "text": chunk, "speed": speed, "gain": 1.0 }));
        }
        out.push(json!({ "silence": silence }));
        rest = &rest[at + len..];
    }
    if out.last().and_then(Value::as_object).map_or(false, |o| o.contains_key("silence")) {
        out.pop();
    }
    if out.is_empty() { out.push(json!({ "text": text, "speed": speed, "gain": 1.0 })); }
    Value::Array(out)
}

pub fn speak(dir: &Path, text: &str, voice: &str, lang: &str, speed: f32, blend: Option<Value>) -> Result<String, String> {
    let voice = clean_voice(voice);
    let out = std::env::temp_dir().join(format!("persocon-tts-{}-{}.wav", std::process::id(), NEXT_ID.fetch_add(1, Ordering::Relaxed)));
    let mut payload = json!({
        "cmd": "speak", "out": out.to_string_lossy(), "voice": voice, "lang": lang_for(voice, lang),
        "sampleRate": 24000, "channels": 1,
        "segments": segments_for(text, speed)
    });
    if let Some(parts) = blend.filter(|v| v.is_array()) {
        let parts: Vec<Value> = parts.as_array().unwrap().iter().filter_map(|p| {
            let id = clean_voice(p.get("voice")?.as_str()?).to_string();
            Some(json!({ "voice": id, "weight": p.get("weight").and_then(Value::as_f64).unwrap_or(0.0) }))
        }).collect();
        if !parts.is_empty() { payload["blend"] = json!(parts); }
    }
    {
        let mut g = get(dir)?;
        let s = g.as_mut().ok_or("TTS indisponível")?;
        let res = request(s, payload.clone())?;
        if res.get("error").and_then(Value::as_str).is_some() {
            // Old sidecars may not understand silence segments: retry with plain text.
            let mut plain = payload.clone();
            plain["segments"] = json!([{ "text": text, "speed": speed, "gain": 1.0 }]);
            let retry = request(s, plain)?;
            if let Some(e2) = retry.get("error").and_then(Value::as_str) {
                let _ = fs::remove_file(&out);
                return Err(e2.to_string());
            }
        }
    }
    let bytes = fs::read(&out).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&out);
    Ok(format!("data:audio/wav;base64,{}", STANDARD.encode(bytes)))
}

// Remote neural voices (Edge / Fish Audio) through a small PowerShell helper,
// so no extra network crates are needed in the Tauri binary.
#[cfg(target_os = "windows")]
const REMOTE_PS: &str = include_str!("tts_remote.ps1");

#[cfg(target_os = "windows")]
pub fn speak_remote(
    engine: &str,
    text: &str,
    voice: &str,
    lang: &str,
    speed: f32,
    pitch_hz: f32,
    api_key: &str,
    fish_voice: &str,
) -> Result<String, String> {
    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    let tmp = std::env::temp_dir();
    let script = tmp.join(format!("persocon-tts-remote-{}.ps1", std::process::id()));
    let input = tmp.join(format!("persocon-tts-remote-{}-{}.txt", std::process::id(), id));
    let output = tmp.join(format!("persocon-tts-remote-{}-{}.mp3", std::process::id(), id));
    fs::write(&script, REMOTE_PS).map_err(|e| e.to_string())?;
    fs::write(&input, text.as_bytes()).map_err(|e| e.to_string())?;
    TTS_CHARS.fetch_add(text.chars().count() as u64, Ordering::Relaxed);
    let mut cmd = Command::new("powershell");
    crate::no_window(&mut cmd);
    let result = cmd
        .arg("-NoProfile").arg("-ExecutionPolicy").arg("Bypass").arg("-File")
        .arg(&script)
        .arg("-Engine").arg(engine)
        .arg("-TextFile").arg(&input)
        .arg("-Out").arg(&output)
        .arg("-Voice").arg(voice)
        .arg("-Lang").arg(lang)
        .arg("-Speed").arg(speed.to_string())
        .arg("-PitchHz").arg(pitch_hz.to_string())
        .arg("-ApiKey").arg(api_key)
        .arg("-FishVoice").arg(fish_voice)
        .output();
    let cleanup = || { let _ = fs::remove_file(&script); let _ = fs::remove_file(&input); let _ = fs::remove_file(&output); };
    match result {
        Ok(out) if out.status.success() && output.exists() => {
            let bytes = fs::read(&output).map_err(|e| e.to_string())?;
            cleanup();
            Ok(format!("data:audio/mpeg;base64,{}", STANDARD.encode(bytes)))
        }
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
            cleanup();
            let lower = err.to_ascii_lowercase();
            if lower.contains("402") || lower.contains("429") || lower.contains("quota")
                || lower.contains("credit") || lower.contains("balance") || lower.contains("saldo") {
                *TTS_QUOTA_ERR.lock().unwrap_or_else(|e| e.into_inner()) = err.clone();
            }
            Err(if err.is_empty() { "TTS remoto falhou".into() } else { err })
        }
        Err(e) => { cleanup(); Err(e.to_string()) }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn speak_remote(
    _engine: &str,
    _text: &str,
    _voice: &str,
    _lang: &str,
    _speed: f32,
    _pitch_hz: f32,
    _api_key: &str,
    _fish_voice: &str,
) -> Result<String, String> {
    Err("Voz remota (PowerShell) indisponível no Linux alpha.".into())
}

pub fn quota() -> Value {
    json!({
        "charsUsed": TTS_CHARS.load(Ordering::Relaxed),
        "quotaError": TTS_QUOTA_ERR.lock().unwrap_or_else(|e| e.into_inner()).clone(),
    })
}

pub fn shutdown() {
    if let Some(mut s) = lock().take() {
        let _ = s.stdin.flush();
        let _ = s.child.kill();
        let _ = s.child.wait();
    }
}
