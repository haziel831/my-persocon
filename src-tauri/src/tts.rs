// Persistent sidecar for offline TTS (voxforge-neural.py, JSON-lines over stdio).
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::os::windows::process::CommandExt;

const NO_WINDOW: u32 = 0x0800_0000;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);
static SESSION: Mutex<Option<Session>> = Mutex::new(None);

struct Session {
    dir: PathBuf,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

fn lock() -> std::sync::MutexGuard<'static, Option<Session>> {
    SESSION.lock().unwrap_or_else(|e| e.into_inner())
}

fn spawn(dir: &Path) -> Result<Session, String> {
    let python = dir.join("resources/python/python.exe");
    let script = dir.join("resources/voxforge-neural.py");
    if !python.is_file() || !script.is_file() { return Err("TTS não encontrado.".into()); }
    let mut child = Command::new(python).arg(script)
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null())
        .creation_flags(NO_WINDOW).spawn().map_err(|e| e.to_string())?;
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

fn lang_for(voice: &str, lang: &str) -> String {
    if !lang.trim().is_empty() { return lang.to_string(); }
    match voice.chars().next().unwrap_or('p').to_ascii_lowercase() {
        'a' => "en-us", 'b' => "en-gb", 'j' => "ja", 'e' => "es", 'f' => "fr-fr", 'i' => "it", _ => "pt-br",
    }.to_string()
}

pub fn voices(dir: &Path) -> Result<Value, String> {
    let mut g = get(dir)?;
    let s = g.as_mut().ok_or("TTS indisponível")?;
    let res = request(s, json!({ "cmd": "voices" }))?;
    Ok(res.get("voices").cloned().unwrap_or(res))
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
                rest = "";
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

pub fn speak(dir: &Path, text: &str, voice: &str, lang: &str, speed: f32) -> Result<String, String> {
    let out = std::env::temp_dir().join(format!("persocon-tts-{}-{}.wav", std::process::id(), NEXT_ID.fetch_add(1, Ordering::Relaxed)));
    let payload = json!({
        "cmd": "speak", "out": out.to_string_lossy(), "voice": voice, "lang": lang_for(voice, lang),
        "sampleRate": 24000, "channels": 1,
        "segments": segments_for(text, speed)
    });
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

pub fn shutdown() {
    if let Some(mut s) = lock().take() {
        let _ = s.stdin.flush();
        let _ = s.child.kill();
        let _ = s.child.wait();
    }
}
