#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod tts;
mod stream_bridge;
mod ai_chat;
mod desktop;
mod logfile;
mod model_io;
mod win32;

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    ffi::OsStr,
    fs,
    os::windows::ffi::OsStrExt,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicI32, AtomicUsize, Ordering},
        Mutex, MutexGuard,
    },
    thread,
    time::Duration,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_dialog::DialogExt;
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

// Zip imports (resourcepacks) must not be allowed to exhaust memory, even if the archive lies
// about its uncompressed sizes or is deliberately malformed.
const MAX_ZIP_ENTRY_BYTES: u64 = 32 * 1024 * 1024;
const MAX_ZIP_TOTAL_BYTES: u64 = 128 * 1024 * 1024;

static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();
static PTT_KEY: AtomicI32 = AtomicI32::new(0x78); // F9

fn ptt_vk(name: &str) -> i32 {
    match name.to_ascii_uppercase().as_str() {
        "F8" => 0x77, "F10" => 0x79, "CAPSLOCK" => 0x14, "RIGHTALT" => 0xA5,
        _ => 0x78, // F9
    }
}

struct PetState {
    // App files (bundled model, emoticons) next to the .exe.
    root: PathBuf,
    // Player files (config, save, backups, imported models, logs): %APPDATA%\My Persocon.
    data: PathBuf,
    config: Mutex<Value>,
    shots: Option<Value>,
    // Started by Windows at logon ("--autostart"): the renderer skips the title screen.
    autostarted: bool,
}

// A poisoned config mutex must not take the whole app down: recover the inner value.
fn lock_config(state: &PetState) -> MutexGuard<'_, Value> {
    state.config.lock().unwrap_or_else(|e| e.into_inner())
}

#[derive(Serialize, Clone, PartialEq)]
struct WindowOut {
    id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    maximized: bool,
    active: bool,
}

#[derive(Serialize, Clone, PartialEq)]
struct WorldOut {
    width: f64,
    height: f64,
    windows: Vec<WindowOut>,
    fullscreen: bool,
    // Foreground window identifier (lowercase title + class), refreshed only when its HWND changes.
    active_app: Option<String>,
    cursor: Option<(f64, f64)>,
    // Arrow key presses (left, right) since the last update; only while the renderer asks for them.
    keys: Option<(u32, u32)>,
    // Work areas of every monitor (physical screen pixels) and the one the overlay covers.
    monitors: Vec<(i32, i32, i32, i32, bool)>,
    display: usize,
}

static WATCH_KEYS: AtomicBool = AtomicBool::new(false);
static DISPLAY: AtomicUsize = AtomicUsize::new(0);
static ON_TOP: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);
// Streamer Mode: a normal (decorated, resizable, taskbar) transparent window for OBS instead of
// the full-monitor overlay; the world is the window's client area.
// Build flag: the plain 2.0 edition sets this to false (no stream tray items). PTT key polling
// is independent of this flag — it also runs in the normal game.
const STREAM_BUILD: bool = true;
static STREAMER: AtomicBool = AtomicBool::new(false);
// Tray "Pause & Mute": silences audio and freezes need decay while the creator is in a call.
static PAUSE_MUTE: AtomicBool = AtomicBool::new(false);
static STREAMER_OPAQUE: AtomicBool = AtomicBool::new(true);
// One Streamer Mode transition at a time: a second toggle while windows are being
// created/destroyed is ignored instead of racing the first one.
static STREAMER_BUSY: AtomicBool = AtomicBool::new(false);
// Combat arena: an isolated, interactive window that only runs fights (own player folder).
static COMBATE: AtomicBool = AtomicBool::new(false);

fn default_config() -> Value {
    json!({
        "name": "Ninna",
        "modelDir": DEFAULT_MODEL,
        "display": 0,
        "monitors": [0],
        "petHeight": 130,
        "walkSpeed": 0.5,
        "runSpeed": 1.4,
        "climbSpeed": 0.5,
        "gravity": 16,
        "jumpReach": 1.6,
        "climbChance": 0.6,
        "actionWeights": { "emote": 12, "idle": 18, "run": 7, "sit": 10, "sleep": 6, "walk": 45 },
        "emotes": ["extra0", "extra1", "extra2", "extra3", "extra4", "extra6"],
        "animRoles": { "extra0": "comemorar", "extra1": "emote_pos", "extra2": "emote_pos", "extra3": "emote_pos", "extra4": "emote_neg", "extra5": "triste", "extra6": "emote_pos", "extra7": "danca" },
        "approach": false,
        "cursorSteal": false,
        "desktopGames": false,
        "iconPlay": false,
        "noAttention": true,
        "screenHit": false,
        "emoticons": true,
        "emoticonRate": 1.0,
        "emoticonScale": 0.75,
        "emoticonOffsetX": -26,
        "emoticonOffsetY": 10,
        "emoteTheme": "padrao",
        "theme": "padrao",
        "menuWidth": 430,
        "menuHeight": 70,
        "menuPinned": false,
        "statusDock": "tr",
        "gbScreenOffset": { "behind": true, "dx": -0.42, "dy": -1.65 },
        "difficulty": "normal",
        "sound": true,
        "volume": 0.3,
        "gbVolume": 0.7,
        "footsteps": false,
        "defaultsRev": 2,
        "debug": false,
        // Solid chroma by default: transparent WebView2 windows capture as black / freeze OBS (WGC).
        "streamerBg": "verde"
    })
}

const DEFAULT_MODEL: &str = "models/MyPersocon";
const AGHATA_MODEL: &str = "models/Aghata";
const APP_NAME: &str = "My Persocon";
// The arena build ("My Persocon Combate.exe") keeps its own player folder.
const COMBATE_APP_NAME: &str = "My Persocon Combate";

// The bundled models live next to the .exe; in development they are a few levels up.
fn find_root() -> PathBuf {
    let mut candidates = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        candidates.extend(exe.ancestors().skip(1).take(5).map(Path::to_path_buf));
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.extend(cwd.ancestors().take(2).map(Path::to_path_buf));
    }
    candidates
        .iter()
        .find(|d| d.join(DEFAULT_MODEL).is_dir() || d.join("config.json").exists())
        .cloned()
        .unwrap_or_else(|| candidates.first().cloned().unwrap_or_default())
}

// Development builds and folders holding "portable.txt" keep the player files next to the app.
// The combat arena always gets a folder of its own so it never touches the shared save.
fn find_data(root: &Path, combate: bool) -> PathBuf {
    if combate {
        let dir = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(|| root.to_path_buf()).join(COMBATE_APP_NAME);
        let _ = fs::create_dir_all(&dir);
        return dir;
    }
    if cfg!(debug_assertions) || root.join("portable.txt").exists() {
        return root.to_path_buf();
    }
    let dir = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(|| root.to_path_buf()).join(APP_NAME);
    let _ = fs::create_dir_all(&dir);
    dir
}

fn rel_to(base: &Path, dir: &Path) -> String {
    dir.strip_prefix(base).unwrap_or(dir).to_string_lossy().replace('\\', "/")
}

// A model folder from config: absolute, imported (player folder) or bundled (app folder).
fn resolve_dir(state: &PetState, dir: &str) -> PathBuf {
    if Path::new(dir).is_absolute() {
        return PathBuf::from(dir);
    }
    let own = state.data.join(dir);
    if own.is_dir() { own } else { state.root.join(dir) }
}

fn load_config(root: &Path) -> Value {
    let mut config = default_config();
    if let Ok(text) = fs::read_to_string(root.join("config.json")) {
        if let Ok(Value::Object(user)) = serde_json::from_str::<Value>(&text) {
            for (k, v) in user {
                config[k] = v;
            }
        }
    }
    config
}

fn parse_shots(arg: &str) -> Value {
    Value::Array(
        arg.split(',')
            .map(|s| {
                let mut parts = s.split(':');
                let anim = parts.next().unwrap_or("idle");
                let pose = parts.next().unwrap_or("stand");
                let mut facings: Vec<&str> = parts.collect();
                if facings.is_empty() {
                    facings.push("front");
                }
                json!({ "anim": anim, "pose": pose, "facings": facings })
            })
            .collect(),
    )
}

fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let b64 = data_url.split_once(',').map(|(_, b)| b).unwrap_or(data_url);
    STANDARD.decode(b64).map_err(|e| e.to_string())
}

fn model_dir(state: &PetState) -> PathBuf {
    let dir = lock_config(state)["modelDir"].as_str().unwrap_or(DEFAULT_MODEL).to_string();
    let found = resolve_dir(state, &dir);
    if found.is_dir() { found } else { state.root.join(DEFAULT_MODEL) }
}

#[tauri::command]
fn get_config(state: State<PetState>) -> Value {
    let mut config = lock_config(&state).clone();
    if let Some(shots) = &state.shots {
        config["previewShots"] = shots.clone();
    }
    config["autostarted"] = json!(state.autostarted);
    config
}

#[tauri::command]
fn save_config(state: State<PetState>, patch: Value) -> Result<Value, String> {
    if let Some(on) = patch.get("debug").and_then(Value::as_bool) {
        logfile::set_enabled(on);
    }
    if let (Some(lang), Some(app)) = (patch.get("lang").and_then(Value::as_str), APP.get()) {
        if let (Some(tray), Ok(menu)) = (app.tray_by_id("main"), tray_menu(app, lang == "en")) {
            let _ = tray.set_menu(Some(menu));
        }
    }
    if let Some(key) = patch.get("pttKey").and_then(Value::as_str) {
        PTT_KEY.store(ptt_vk(key), Ordering::Release);
    }
    let mut config = lock_config(&state);
    if let Value::Object(p) = patch {
        for (k, v) in p {
            config[k] = v;
        }
    }
    let text = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
    // Write-then-rename: a crash mid-write must not leave a truncated config behind.
    let path = state.data.join("config.json");
    let tmp = state.data.join("config.json.tmp");
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(config.clone())
}

// A VRoid model: the .vrm file itself, or a model folder holding one.
fn vrm_file(p: &Path) -> Option<PathBuf> {
    let is_vrm = |q: &Path| q.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("vrm") || e.eq_ignore_ascii_case("glb")).unwrap_or(false);
    if p.is_file() {
        return is_vrm(p).then(|| p.to_path_buf());
    }
    fs::read_dir(p).ok()?.flatten().map(|e| e.path()).find(|q| q.is_file() && is_vrm(q))
}

// Name, authors, version and expression names from the glTF JSON chunk of a .vrm (VRM 0.x and 1.0).
fn vrm_info(bytes: &[u8], path: &Path) -> Value {
    let u32_at = |i: usize| bytes.get(i..i + 4).map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]) as usize);
    let gltf: Value = (|| {
        if bytes.get(0..4)? != b"glTF" {
            return None;
        }
        let len = u32_at(12)?;
        serde_json::from_slice(bytes.get(20..20 + len)?).ok()
    })()
    .unwrap_or(Value::Null);
    let ext = &gltf["extensions"];
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("VRoid").to_string();
    let (name, authors, version, expressions): (String, Vec<Value>, &str, Vec<Value>) = if ext["VRMC_vrm"].is_object() {
        let v = &ext["VRMC_vrm"];
        let mut ex: Vec<Value> = v["expressions"]["preset"].as_object().map(|o| o.keys().map(|k| json!(k)).collect()).unwrap_or_default();
        if let Some(o) = v["expressions"]["custom"].as_object() {
            ex.extend(o.keys().map(|k| json!(k)));
        }
        (v["meta"]["name"].as_str().unwrap_or(&stem).to_string(), v["meta"]["authors"].as_array().cloned().unwrap_or_default(), "1.0", ex)
    } else {
        let v = &ext["VRM"];
        let ex = v["blendShapeMaster"]["blendShapeGroups"].as_array().map(|a| {
            a.iter().map(|g| json!(g["presetName"].as_str().filter(|s| !s.is_empty() && *s != "unknown").or(g["name"].as_str()).unwrap_or(""))).collect()
        }).unwrap_or_default();
        let author = v["meta"]["author"].as_str().filter(|s| !s.is_empty()).map(|s| vec![json!(s)]).unwrap_or_default();
        (v["meta"]["title"].as_str().filter(|s| !s.is_empty()).unwrap_or(&stem).to_string(), author, "0.x", ex)
    };
    json!({
        "kind": "vrm", "name": name, "authors": authors, "version": version, "expressions": expressions,
        "bytes": bytes.len(), "source": path.display().to_string(), "animationFiles": [], "textures": [], "animationCount": 0,
    })
}

fn vrm_data(path: &Path) -> Result<(Vec<u8>, Value), String> {
    let bytes = fs::read(path).map_err(|e| format!("Não foi possível ler {}: {e}", path.display()))?;
    let data = json!({ "vrm": format!("data:model/gltf-binary;base64,{}", STANDARD.encode(&bytes)) });
    Ok((bytes, data))
}

fn model_files_at(dir: &Path) -> Result<Value, String> {
    if dir.join("mc.json").is_file() {
        let skin = fs::read(dir.join("skin.png")).map_err(|e| e.to_string())?;
        let meta: Value = serde_json::from_str(&fs::read_to_string(dir.join("mc.json")).unwrap_or_default()).unwrap_or(Value::Null);
        return Ok(json!({ "mcSkin": format!("data:image/png;base64,{}", STANDARD.encode(&skin)), "slim": meta["slim"].as_bool().unwrap_or(false) }));
    }
    if let Some(f) = vrm_file(dir) {
        return Ok(vrm_data(&f)?.1);
    }
    Ok(model_io::load(dir)?.render_data(None))
}

#[tauri::command]
fn load_model(state: State<PetState>) -> Result<Value, String> {
    model_files_at(&model_dir(&state))
}

// Load a model folder by relative path (e.g. the Doll's Yes Steve Model).
#[tauri::command]
fn load_model_dir(state: State<PetState>, dir: String) -> Result<Value, String> {
    let path = resolve_dir(&state, &dir);
    if !path.is_dir() {
        return Err(format!("Pasta de modelo não encontrada: {dir}"));
    }
    model_files_at(&path)
}

// Install a YSM/VRM for the Doll without changing the Persocon's modelDir.
#[tauri::command]
async fn install_side_model(
    state: State<'_, PetState>,
    path: String,
    name: String,
    texture: Option<String>,
) -> Result<Value, String> {
    let safe = safe_name(&name, "Doll");
    let dir = if let Some(f) = vrm_file(Path::new(&path)) {
        let dir = state.data.join("models").join(&safe);
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        fs::copy(&f, dir.join("model.vrm")).map_err(|e| e.to_string())?;
        dir
    } else {
        model_io::load(Path::new(&path))?.install(&state.data.join("models"), &safe, texture.as_deref())?
    };
    let rel = rel_to(&state.data, &dir);
    Ok(json!({ "dir": rel }))
}

#[tauri::command]
async fn pick_model_source(window: WebviewWindow, folder: bool) -> Option<String> {
    let dialog = window.dialog().file().set_parent(&window).set_title("Importar modelo");
    let picked = if folder {
        dialog.blocking_pick_folder()
    } else {
        dialog.add_filter("Modelos (YSM .zip, 3D .vrm/.glb)", &["zip", "vrm", "glb"]).blocking_pick_file()
    };
    picked.and_then(|p| p.into_path().ok()).map(|p| p.display().to_string())
}

#[tauri::command]
async fn inspect_model(path: String) -> Result<Value, String> {
    let source = PathBuf::from(&path);
    if let Some(f) = vrm_file(&source) {
        let (bytes, data) = vrm_data(&f)?;
        return Ok(json!({ "info": vrm_info(&bytes, &f), "model": data }));
    }
    let model = model_io::load(&source)?;
    Ok(json!({ "info": model.info(&source), "model": model.render_data(None) }))
}

#[tauri::command]
async fn import_model(
    state: State<'_, PetState>,
    path: String,
    name: String,
    texture: Option<String>,
    pet_height: Option<f64>,
) -> Result<Value, String> {
    let dir = if let Some(f) = vrm_file(Path::new(&path)) {
        let dir = state.data.join("models").join(safe_name(&name, "vroid"));
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        fs::copy(&f, dir.join("model.vrm")).map_err(|e| e.to_string())?;
        dir
    } else {
        model_io::load(Path::new(&path))?.install(&state.data.join("models"), &name, texture.as_deref())?
    };
    let rel = rel_to(&state.data, &dir);
    let mut patch = json!({ "modelDir": rel, "name": name });
    if let Some(h) = pet_height {
        patch["petHeight"] = json!(h.round());
    }
    save_config(state, patch)
}

fn mime_of(name: &str) -> &'static str {
    let lower = name.to_ascii_lowercase();
    match lower.rsplit('.').next().unwrap_or("") {
        "png" => "image/png",
        "gif" => "image/gif",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ogg" => "audio/ogg",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "glb" | "vrm" => "model/gltf-binary",
        "json" | "mcmeta" => "application/json",
        _ => "application/octet-stream",
    }
}

fn safe_name(name: &str, fallback: &str) -> String {
    let safe: String = name.chars().map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect();
    if safe.trim_matches('_').is_empty() { fallback.to_string() } else { safe }
}

#[tauri::command]
async fn pick_file(window: WebviewWindow, title: String, label: String, exts: Vec<String>) -> Option<String> {
    let ext: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
    let picked = window.dialog().file().set_parent(&window).set_title(&title).add_filter(&label, &ext).blocking_pick_file();
    picked.and_then(|p| p.into_path().ok()).map(|p| p.display().to_string())
}

#[tauri::command]
fn read_file_data(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(format!("data:{};base64,{}", mime_of(&path), STANDARD.encode(&bytes)))
}

// MIDI file from an http(s) link. curl ships with Windows and ignores page CORS.
#[tauri::command]
async fn fetch_midi(url: String) -> Result<String, String> {
    // curl can take up to 20s: never hold a command thread for that long.
    tauri::async_runtime::spawn_blocking(move || fetch_midi_blocking(&url))
        .await
        .unwrap_or_else(|_| Err("Não deu para baixar o MIDI".to_string()))
}

fn fetch_midi_blocking(url: &str) -> Result<String, String> {
    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("http://")) || url.chars().any(|c| c.is_control()) {
        return Err("Link inválido.".into());
    }
    let path = std::env::temp_dir().join(format!("persocon-mid-{}-{}.bin", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)));
    let status = std::process::Command::new("curl.exe")
        .args(["-fsSL", "--max-time", "20", "--max-filesize", "2097152", "-L", "-A", "MyPersocon", "-o"])
        .arg(&path)
        .arg(url)
        .creation_flags(0x08000000)
        .status()
        .map_err(|_| "Não deu para baixar o MIDI".to_string());
    let bytes = fs::read(&path);
    let _ = fs::remove_file(&path);
    let status = status?;
    if !status.success() {
        return Err("Não deu para baixar o MIDI".into());
    }
    let bytes = bytes.map_err(|_| "Não deu para baixar o MIDI".to_string())?;
    if bytes.is_empty() || bytes.len() > 2 * 1024 * 1024 {
        return Err("Não deu para baixar o MIDI".into());
    }
    Ok(format!("data:audio/midi;base64,{}", STANDARD.encode(bytes)))
}

// Entries of a zip (a Minecraft resourcepack) under any of the given prefixes, as data URLs.
#[tauri::command]
async fn read_zip(path: String, prefixes: Vec<String>, max_files: usize) -> Result<Value, String> {
    use std::io::Read;
    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("zip inválido: {e}"))?;
    let mut out = serde_json::Map::new();
    let mut names = Vec::new();
    let mut total = 0u64;
    for i in 0..zip.len() {
        let f = zip.by_index(i).map_err(|e| e.to_string())?;
        if !f.is_file() {
            continue;
        }
        let name = f.name().replace('\\', "/");
        names.push(json!(name));
        if out.len() >= max_files || !prefixes.iter().any(|p| name.starts_with(p.as_str())) {
            continue;
        }
        // Read one byte past the cap so an oversized entry is detectable without buffering it all.
        let mut bytes = Vec::new();
        f.take(MAX_ZIP_ENTRY_BYTES + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        if bytes.len() as u64 > MAX_ZIP_ENTRY_BYTES {
            return Err("Arquivo dentro do zip excede o limite de tamanho.".into());
        }
        total += bytes.len() as u64;
        if total > MAX_ZIP_TOTAL_BYTES {
            return Err("Zip excede o limite máximo de tamanho descomprimido.".into());
        }
        out.insert(name.clone(), json!(format!("data:{};base64,{}", mime_of(&name), STANDARD.encode(&bytes))));
    }
    Ok(json!({ "files": out, "names": names }))
}

// Big data (resourcepack, imported object skins) kept as JSON files next to the save.
#[tauri::command]
fn store_blob(state: State<PetState>, name: String, data: Value) -> Result<(), String> {
    let dir = state.data.join("data");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{}.json", safe_name(&name, "blob"))), serde_json::to_vec(&data).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_blob(state: State<PetState>, name: String) -> Option<Value> {
    let text = fs::read(state.data.join("data").join(format!("{}.json", safe_name(&name, "blob")))).ok()?;
    serde_json::from_slice(&text).ok()
}

// Minecraft skin as the pet: the renderer builds the model and animations from the skin.
#[tauri::command]
fn import_mc_skin(state: State<PetState>, name: String, skin: String, slim: bool, pet_height: Option<f64>) -> Result<Value, String> {
    let safe = safe_name(&name, "skin");
    let dir = state.data.join("models").join(&safe);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("skin.png"), decode_data_url(&skin)?).map_err(|e| e.to_string())?;
    fs::write(dir.join("mc.json"), json!({ "slim": slim }).to_string()).map_err(|e| e.to_string())?;
    let rel = rel_to(&state.data, &dir);
    let mut patch = json!({ "modelDir": rel, "name": name });
    if let Some(h) = pet_height {
        patch["petHeight"] = json!(h.round());
    }
    save_config(state, patch)
}

// Models already installed (the bundled one and everything under models/), to switch back quickly.
#[tauri::command]
fn list_models(state: State<PetState>) -> Vec<Value> {
    let mut dirs: Vec<(PathBuf, &Path)> = Vec::new();
    for base in [&state.data, &state.root] {
        if let Ok(rd) = fs::read_dir(base.join("models")) {
            for d in rd.flatten().map(|e| e.path()).filter(|p| p.is_dir()) {
                if !dirs.iter().any(|(o, b)| rel_to(b, o) == rel_to(base, &d)) {
                    dirs.push((d, base.as_path()));
                }
            }
        }
    }
    dirs.into_iter()
        .map(|(d, base)| {
            let kind = if d.join("mc.json").is_file() { "mc" } else if vrm_file(&d).is_some() { "vrm" } else { "ysm" };
            let rel = rel_to(base, &d);
            let name = d.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
            let modified = fs::metadata(&d)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|t| t.as_secs())
                .unwrap_or(0);
            let skin = if kind == "mc" { fs::read(d.join("skin.png")).ok().map(|b| format!("data:image/png;base64,{}", STANDARD.encode(&b))) } else { None };
            json!({ "dir": rel, "name": name, "kind": kind, "modified": modified, "skin": skin, "removable": base == state.data.as_path() && rel != DEFAULT_MODEL && rel != AGHATA_MODEL })
        })
        .collect()
}

// Deletes an imported model: only folders directly under the data models/, never the one in use.
#[tauri::command]
fn delete_model(state: State<PetState>, dir: String) -> Result<(), String> {
    let (Ok(base), Ok(target)) = (state.data.join("models").canonicalize(), state.data.join(&dir).canonicalize()) else {
        return Err("Modelo não encontrado.".into());
    };
    if target.parent() != Some(base.as_path()) || dir == DEFAULT_MODEL || dir == AGHATA_MODEL {
        return Err("Esse modelo não pode ser apagado.".into());
    }
    if lock_config(&state)["modelDir"].as_str() == Some(dir.as_str()) {
        return Err("Esse modelo está em uso.".into());
    }
    fs::remove_dir_all(&target).map_err(|e| e.to_string())
}

// The Demo keeps its own save (save-demo.json); it is not compatible with the full game's.
static DEMO_SAVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

fn demo_save() -> bool {
    DEMO_SAVE.load(std::sync::atomic::Ordering::Relaxed)
}

fn streamer_save() -> bool {
    STREAMER.load(Ordering::Relaxed)
}

fn save_name() -> &'static str {
    if streamer_save() { "save-streamer.json" }
    else if demo_save() { "save-demo.json" }
    else { "save.json" }
}

fn backup_name(i: usize) -> String {
    if streamer_save() { format!("save-streamer-{i}.json") }
    else if demo_save() { format!("save-demo-{i}.json") }
    else { format!("save-{i}.json") }
}

fn new_game_mark() -> &'static str {
    if streamer_save() { "new-game-streamer.flag" }
    else if demo_save() { "new-game-demo.flag" }
    else { "new-game.flag" }
}

#[tauri::command]
fn load_save(state: State<PetState>, demo: Option<bool>) -> Option<Value> {
    DEMO_SAVE.store(demo.unwrap_or(false), std::sync::atomic::Ordering::Relaxed);
    let read = |p: PathBuf| fs::read_to_string(p).ok().and_then(|t| serde_json::from_str::<Value>(&t).ok()).filter(Value::is_object);
    read(state.data.join(save_name())).or_else(|| {
        if state.data.join(new_game_mark()).exists() {
            return None;
        }
        let backups = state.data.join("backups");
        (1..=SAVE_BACKUPS).find_map(|i| read(backups.join(backup_name(i))))
            // Saves from before the split were shared: the Demo picks up the old one once.
            // Streamer Mode must never read the main save.
            .or_else(|| if demo_save() && !streamer_save() { read(state.data.join("save.json")) } else { None })
    })
}

const SAVE_BACKUPS: usize = 3;
static LAST_BACKUP: Mutex<Option<std::time::Instant>> = Mutex::new(None);

// save.json -> backups/save-1.json, shifting the older ones (save-3 is dropped).
fn rotate_backups(data: &Path) {
    let save = data.join(save_name());
    if !save.is_file() {
        return;
    }
    let dir = data.join("backups");
    let _ = fs::create_dir_all(&dir);
    for i in (1..SAVE_BACKUPS).rev() {
        let _ = fs::rename(dir.join(backup_name(i)), dir.join(backup_name(i + 1)));
    }
    let _ = fs::copy(&save, dir.join(backup_name(1)));
}

fn write_save(data: &Path, value: &Value) -> Result<(), String> {
    let path = data.join(save_name());
    let tmp = data.join(format!("{}.tmp", save_name()));
    fs::write(&tmp, serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(data.join(new_game_mark()));
    Ok(())
}

// A backup at the first save of the session and then once an hour.
#[tauri::command]
fn store_save(state: State<PetState>, data: Value) -> Result<(), String> {
    {
        let mut last = LAST_BACKUP.lock().unwrap_or_else(|e| e.into_inner());
        if last.map_or(true, |t| t.elapsed() >= Duration::from_secs(3600)) {
            rotate_backups(&state.data);
            *last = Some(std::time::Instant::now());
        }
    }
    write_save(&state.data, &data)
}

#[tauri::command]
async fn export_save(app: AppHandle, state: State<'_, PetState>) -> Result<bool, String> {
    let src = state.data.join(save_name());
    if !src.is_file() {
        return Err("no save".into());
    }
    let Some(path) = app.dialog().file().set_file_name("my-persocon-save.json").add_filter("Save", &["json"]).blocking_save_file() else {
        return Ok(false);
    };
    let dest = path.into_path().map_err(|e| e.to_string())?;
    fs::copy(&src, dest).map_err(|e| e.to_string())?;
    Ok(true)
}

// Replaces the save (the current one goes to the backups); the renderer reloads afterwards.
#[tauri::command]
async fn import_save(app: AppHandle, state: State<'_, PetState>) -> Result<bool, String> {
    let Some(path) = app.dialog().file().add_filter("Save", &["json"]).blocking_pick_file() else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    let value: Value = serde_json::from_str(&fs::read_to_string(&path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    if !value.is_object() || value.get("profile").is_none() {
        return Err("invalid save".into());
    }
    rotate_backups(&state.data);
    write_save(&state.data, &value)?;
    Ok(true)
}

const RUN_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";

fn reg(args: &[&str]) -> bool {
    use std::os::windows::process::CommandExt;
    std::process::Command::new("reg").args(args).creation_flags(0x0800_0000).output().map(|o| o.status.success()).unwrap_or(false)
}

#[tauri::command]
fn get_autostart() -> bool {
    reg(&["query", RUN_KEY, "/v", APP_NAME])
}

#[tauri::command]
fn set_autostart(value: bool) -> Result<bool, String> {
    let ok = if value {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        reg(&["add", RUN_KEY, "/v", APP_NAME, "/t", "REG_SZ", "/d", &format!("\"{}\" --autostart", exe.display()), "/f"])
    } else {
        !get_autostart() || reg(&["delete", RUN_KEY, "/v", APP_NAME, "/f"])
    };
    if ok { Ok(value) } else { Err("registry".into()) }
}

/// Recursively masks any field whose name looks like a credential. Used only on the copy of
/// the config that goes into a support zip; the real config.json on disk is never touched.
fn mask_secrets(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, child) in map.iter_mut() {
                let lower = key.to_ascii_lowercase();
                if lower.contains("key") || lower.contains("token") || lower.contains("secret") {
                    *child = Value::String("***".into());
                } else {
                    mask_secrets(child);
                }
            }
        }
        Value::Array(list) => {
            for child in list.iter_mut() {
                mask_secrets(child);
            }
        }
        _ => {}
    }
}

/// Collects actual credential values from the config so they can be scrubbed from log text too.
fn collect_secrets(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            for (key, child) in map {
                let lower = key.to_ascii_lowercase();
                if lower.contains("key") || lower.contains("token") || lower.contains("secret") {
                    if let Some(s) = child.as_str() {
                        if s.len() >= 6 { out.push(s.to_string()); }
                    }
                } else {
                    collect_secrets(child, out);
                }
            }
        }
        Value::Array(list) => {
            for child in list { collect_secrets(child, out); }
        }
        _ => {}
    }
}

// Zip for bug reports: what the renderer knows (version, screen, recent log), config, logs and the save.
#[tauri::command]
async fn make_report(app: AppHandle, state: State<'_, PetState>, info: String) -> Result<String, String> {
    use std::io::Write;
    let Some(path) = app.dialog().file().set_file_name("my-persocon-report.zip").add_filter("Zip", &["zip"]).blocking_save_file() else {
        return Ok(String::new());
    };
    let dest = path.into_path().map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(fs::File::create(&dest).map_err(|e| e.to_string())?);
    let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let mut add = |name: &str, bytes: &[u8]| -> Result<(), String> {
        zip.start_file(name, opts).map_err(|e| e.to_string())?;
        zip.write_all(bytes).map_err(|e| e.to_string())
    };
    add("info.txt", format!("My Persocon v{}\n{}", env!("CARGO_PKG_VERSION"), info).as_bytes())?;
    for name in ["config.json", save_name()] {
        if let Ok(b) = fs::read(state.data.join(name)) {
            if name == "config.json" {
                // Export a masked copy only — never the original bytes with real API keys.
                let export = match serde_json::from_slice::<Value>(&b) {
                    Ok(mut cfg) => {
                        mask_secrets(&mut cfg);
                        serde_json::to_string_pretty(&cfg).unwrap_or_default()
                    }
                    Err(_) => "{\"error\":\"config could not be parsed; not exported\"}".to_string(),
                };
                add(name, export.as_bytes())?;
            } else {
                add(name, &b)?;
            }
        }
    }
    // Scrub real credential values that may have leaked into log lines.
    let mut secrets = Vec::new();
    if let Ok(b) = fs::read(state.data.join("config.json")) {
        if let Ok(cfg) = serde_json::from_slice::<Value>(&b) {
            collect_secrets(&cfg, &mut secrets);
        }
    }
    if let Ok(rd) = fs::read_dir(state.data.join("log")) {
        for p in rd.flatten().map(|e| e.path()).filter(|p| p.extension().map_or(false, |e| e == "log")) {
            if let (Some(n), Ok(b)) = (p.file_name().and_then(|n| n.to_str()), fs::read(&p)) {
                let mut text = String::from_utf8_lossy(&b).into_owned();
                for secret in &secrets {
                    if !secret.is_empty() { text = text.replace(secret, "***"); }
                }
                add(&format!("log/{n}"), text.as_bytes())?;
            }
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

// Erases the save (kept as a backup) so the next start is a brand new game.
#[tauri::command]
fn reset_save(state: State<PetState>) -> Result<(), String> {
    rotate_backups(&state.data);
    let _ = fs::write(state.data.join(new_game_mark()), b"");
    let _ = fs::remove_file(state.data.join(save_name()));
    Ok(())
}

#[tauri::command]
fn set_interactive(window: WebviewWindow, value: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(!value).map_err(|e| e.to_string())
}

/// A left click on something that ignores it (furniture): hands the press to what is underneath.
#[tauri::command]
fn pass_click(window: WebviewWindow) -> Result<(), String> {
    window.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
    win32::resend_left_down();
    Ok(())
}

#[tauri::command]
fn set_on_top(window: WebviewWindow, value: bool) {
    ON_TOP.store(value, Ordering::Relaxed);
    let _ = window.set_always_on_top(value);
}

const fn window_label(streamer: bool) -> &'static str {
    if streamer { "stream" } else { "main" }
}

// Solid chroma key colors → opaque HWND (captures cleanly in OBS). Transparent layered
// WebView2 windows often show as black or freeze Window Capture on Win10/11 (WGC / BitBlt).
fn streamer_opaque(config: &Value) -> bool {
    matches!(config["streamerBg"].as_str(), Some("verde" | "azul" | "magenta"))
}

fn streamer_css_bg(config: &Value) -> &'static str {
    match config["streamerBg"].as_str() {
        Some("verde") => "#00ff00",
        Some("azul") => "#0000ff",
        Some("magenta") => "#ff00ff",
        _ => "transparent",
    }
}

// The overlay ("main") or the Streamer Mode window ("stream"). Switching modes builds a fresh
// window: OBS keeps its yellow capture border on a window for as long as it captures it.
fn build_window<M: Manager<tauri::Wry>>(app: &M, streamer: bool, preview: bool, combate: bool, config: &Value) -> tauri::Result<WebviewWindow> {
    let opaque = streamer && streamer_opaque(config);
    let bg = streamer_css_bg(config);
    let init = if preview {
        "window.__PET_PREVIEW__ = true;".to_string()
    } else if combate {
        "window.__PET_COMBATE__ = true;".to_string()
    } else if streamer {
        format!(
            "window.__PET_STREAMER__ = true;document.documentElement.style.background='{bg}';document.body&&(document.body.style.background='{bg}');"
        )
    } else {
        String::new()
    };
    let builder = WebviewWindowBuilder::new(app, window_label(streamer), WebviewUrl::App("index.html".into()))
        .transparent(!opaque)
        // Defaults Tauri passes to WebView2, plus sound without a prior click; the rest keeps the
        // page painting when hidden behind other windows (OBS captures it there).
        .additional_browser_args(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion \
             --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
             --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        )
        .visible(!preview)
        .initialization_script(init);
    let win = if streamer {
        builder
            .title("My Persocon - Streamer Mode")
            .inner_size(1280.0, 720.0)
            .center()
            // A game in fullscreen keeps the focus: don't steal it when this window opens.
            .focused(!win32::foreground_fullscreen())
            .build()?
    } else if combate {
        // The arena is a plain, interactive window: the buttons need clicks and the taskbar.
        builder
            .title("My Persocon - Combate")
            .inner_size(1280.0, 800.0)
            .center()
            .focused(true)
            .build()?
    } else {
        builder
            .title(APP_NAME)
            .decorations(false)
            .shadow(false)
            .resizable(false)
            .always_on_top(!preview && ON_TOP.load(Ordering::Relaxed))
            .skip_taskbar(true)
            .focused(false)
            .inner_size(900.0, 600.0)
            .build()?
    };
    if streamer {
        // Closing the Streamer Mode window only leaves Streamer Mode.
        let w = win.clone();
        win.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = w.emit("streamer", false);
            }
        });
    } else if !preview && !combate {
        // Start interactive. The renderer switches to click-through only when it knows the
        // cursor is over empty space — starting ignored swallowed every click (incl. the intro box).
        if let Ok(h) = win.hwnd() {
            win32::set_tool_window(h.0 as _);
        }
    }
    Ok(win)
}

fn wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

// Opens the local control panel as a normal tab in the user's default browser.
// No --app= window: that mode duplicated panels and confused OBS window capture.
fn open_url_in_browser(url: &str) {
    let operation = wide("open");
    let file = wide(url);
    let r = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if (r as isize) <= 32 {
        logfile::line("ERROR", "streamer", &format!("não foi possível abrir {url}"));
    }
}

fn bridge_address(config: &Value) -> (u16, String) {
    let port = config.get("streamBridgePort").and_then(Value::as_u64).unwrap_or(48321) as u16;
    let token = config.get("bridgeToken").and_then(Value::as_str).unwrap_or("").to_string();
    (port, token)
}

fn ensure_streamer_control(app: &AppHandle, config: &Value) {
    let (port, token) = bridge_address(config);
    if let Err(e) = stream_bridge::start(app.clone(), port, token) {
        logfile::line("ERROR", "streamer", &format!("ponte local: {e}"));
    }
    open_url_in_browser(&format!("http://127.0.0.1:{port}/"));
}

// Always opens the Streamer control panel in a normal browser tab.
// `mode` is kept only so older callers do not break.
#[tauri::command]
fn open_streamer_panel(app: AppHandle, state: State<'_, PetState>, mode: String) -> Result<String, String> {
    let _ = mode;
    {
        let mut config = lock_config(&state);
        config["streamPanelMode"] = json!("tab");
        let text = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
        fs::write(state.data.join("config.json"), text).map_err(|e| e.to_string())?;
    }
    let (port, token) = bridge_address(&lock_config(&state));
    if let Err(e) = stream_bridge::start(app.clone(), port, token) {
        logfile::line("ERROR", "streamer", &format!("ponte local: {e}"));
    }
    open_url_in_browser(&format!("http://127.0.0.1:{port}/"));
    Ok("Aba aberta no navegador".into())
}

#[tauri::command]
fn list_open_windows() -> Result<Vec<Value>, String> {
    Ok(win32::list_open_windows().into_iter()
        .map(|(title, process)| json!({ "title": title, "process": process }))
        .collect())
}

#[tauri::command]
async fn ai_reply(prompt: String, system_prompt: String, config: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let pick = |keys: &[&str]| -> String {
            for key in keys {
                if let Some(s) = config.get(*key).and_then(Value::as_str) {
                    let t = s.trim();
                    if !t.is_empty() { return t.to_string(); }
                }
            }
            String::new()
        };
        let lang = pick(&["lang", "language"]);
        let lang = if lang.is_empty() { "pt".to_string() } else { lang };
        let system = if system_prompt.trim().is_empty() {
            "You are the Persocon, a gentle anime-style desktop companion living on a streamer's desktop.".to_string()
        } else { system_prompt };
        // A PTT voice order is a direct command from the creator: it outranks chat events,
        // alerts and autonomous behaviour. The instruction goes at the very top of the system
        // prompt (reply_one appends language/length rules after it).
        let system = if config.get("userPriority").and_then(Value::as_bool).unwrap_or(false) {
            let head = if lang == "en" {
                "[MAXIMUM PRIORITY / USER_PRIORITY] The creator has just given a direct voice command. Ignore Twitch chat, stream events, alerts and any autonomous chatter. Obey this order immediately and answer only what was asked."
            } else {
                "[PRIORIDADE MÁXIMA / USER_PRIORITY] O criador acabou de dar uma ordem direta por voz. Ignore o chat da Twitch, eventos da stream, alertas e qualquer fala autônoma. Obedeça imediatamente e responda apenas ao que foi pedido."
            };
            format!("{head}\n{system}")
        } else { system };
        let providers: Vec<Value> = match config.get("aiProviders").and_then(Value::as_array) {
            Some(list) if !list.is_empty() => list.clone(),
            _ => {
                let legacy = pick(&["aiProvider", "provider", "type"]);
                let key = pick(&["aiApiKey", "apiKey", "api_key"]);
                let endpoint = pick(&["aiEndpoint", "aiUrl", "endpoint", "url"]);
                vec![json!({
                    "name": if legacy.is_empty() { "Ollama" } else { &legacy },
                    "provider": if legacy.is_empty() { "ollama" } else { &legacy },
                    "model": pick(&["aiModel", "model"]),
                    "endpoint": &endpoint,
                    "url": &endpoint,
                    "apiKey": &key,
                    "api_key": &key,
                    "enabled": true,
                })]
            }
        };
        let auto = config.get("aiAutoFallback").and_then(Value::as_bool).unwrap_or(true);
        ai_chat::reply_chain(&providers, &system, &prompt, &lang, auto)
    }).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
fn tts_quota() -> Result<Value, String> { Ok(tts::quota()) }

#[tauri::command]
fn streamer_take_rpc() -> Result<Vec<Value>, String> {
    Ok(stream_bridge::take_rpcs())
}

#[tauri::command]
fn streamer_push_state(state: Value) -> Result<(), String> {
    stream_bridge::set_state(state);
    Ok(())
}

#[tauri::command]
fn set_streamer(app: AppHandle, state: State<'_, PetState>, value: bool) -> Result<(), String> {
    if STREAMER_BUSY.swap(true, Ordering::AcqRel) {
        return Ok(());
    }
    let config = lock_config(&state).clone();
    let was = STREAMER.load(Ordering::Relaxed);
    let was_opaque = STREAMER_OPAQUE.load(Ordering::Relaxed);
    let want_opaque = value && streamer_opaque(&config);
    // Page load used to call this while already in Streamer Mode and rebuild forever (crash).
    if was == value && (!value || was_opaque == want_opaque) {
        STREAMER_BUSY.store(false, Ordering::Release);
        return Ok(());
    }
    STREAMER.store(value, Ordering::Relaxed);
    STREAMER_OPAQUE.store(want_opaque, Ordering::Relaxed);
    let handle = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(80));
        let ok = handle.run_on_main_thread({
            let handle = handle.clone();
            move || {
                if was && value {
                    if let Some(w) = handle.get_webview_window("stream") {
                        let _ = w.destroy();
                    }
                }
                if !value {
                    // The control panel is a normal browser TAB, not a --app= window. Sending
                    // WM_CLOSE to the browser window would close the user's whole browser.
                    // Only flag the state: the panel polls /state and closes its own tab.
                    stream_bridge::mark_closing();
                    let mut cfg = config.clone();
                    cfg["streamer"] = json!(false);
                    stream_bridge::set_state(json!({ "config": cfg }));
                }
                match build_window(&handle, value, false, false, &config) {
                    Ok(_) => {
                        if !(was && value) {
                            if let Some(w) = handle.get_webview_window(window_label(!value)) {
                                let _ = w.destroy();
                            }
                        }
                        if value && !was {
                            ensure_streamer_control(&handle, &config);
                        }
                    }
                    Err(e) => {
                        STREAMER.store(was, Ordering::Relaxed);
                        STREAMER_OPAQUE.store(was_opaque, Ordering::Relaxed);
                        logfile::line("ERROR", "streamer", &e.to_string());
                    }
                }
                // Windows are built/destroyed here: the transition is over.
                STREAMER_BUSY.store(false, Ordering::Release);
            }
        });
        if ok.is_err() {
            STREAMER.store(was, Ordering::Relaxed);
            STREAMER_OPAQUE.store(was_opaque, Ordering::Relaxed);
            STREAMER_BUSY.store(false, Ordering::Release);
        }
    });
    Ok(())
}

// Reopens the control panel in the browser (tray menu / renderer helper).
#[tauri::command]
fn open_streamer_control(app: AppHandle, state: State<'_, PetState>) -> Result<(), String> {
    if !STREAMER.load(Ordering::Relaxed) { return Ok(()); }
    let config = lock_config(&state).clone();
    ensure_streamer_control(&app, &config);
    Ok(())
}

// Relay commands/state between the stage ("stream") and the control panel ("stream-ctrl").
#[tauri::command]
fn streamer_rpc(app: AppHandle, target: String, payload: Value) -> Result<(), String> {
    // The old WebView2 control window is gone: both aliases deliver to the stage window,
    // which forwards state to the browser panel through streamer_push_state.
    if target != "stream" && target != "stream-ctrl" {
        return Err("alvo inválido".into());
    }
    if let Some(w) = app.get_webview_window("stream") {
        let _ = w.emit("streamer-rpc", payload);
    }
    Ok(())
}

#[tauri::command]
async fn tts_voices(dir: Option<String>) -> Result<Value, String> {
    let path = PathBuf::from(dir.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| "D:\\Program Files\\Offline TTS".into()));
    tauri::async_runtime::spawn_blocking(move || tts::voices(&path)).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
async fn tts_speak(dir: Option<String>, text: String, voice: String, lang: String, speed: Option<f32>, blend: Option<Value>) -> Result<String, String> {
    let path = PathBuf::from(dir.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| "D:\\Program Files\\Offline TTS".into()));
    tauri::async_runtime::spawn_blocking(move || tts::speak(&path, &text, &voice, &lang, speed.unwrap_or(1.0), blend)).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
async fn tts_speak_remote(engine: String, text: String, voice: String, lang: String,
                          speed: Option<f32>, pitch_hz: Option<f32>, api_key: Option<String>,
                          fish_voice: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        tts::speak_remote(&engine, &text, &voice, &lang, speed.unwrap_or(1.0),
            pitch_hz.unwrap_or(0.0), api_key.as_deref().unwrap_or(""), fish_voice.as_deref().unwrap_or(""))
    }).await.unwrap_or_else(|e| Err(e.to_string()))
}

#[tauri::command]
async fn tts_stop() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(tts::shutdown).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn stream_bridge_start(port: Option<u16>, token: Option<String>) -> Result<(), String> {
    let app = APP.get().cloned().ok_or("app indisponível")?;
    stream_bridge::start(app, port.unwrap_or(48321), token.unwrap_or_default())
}

#[tauri::command]
fn stream_bridge_stop() -> Result<(), String> {
    stream_bridge::stop();
    Ok(())
}

#[tauri::command]
fn focus_window(window: WebviewWindow) {
    // A game in fullscreen owns the focus (and the mouse): don't pull it away from it.
    if win32::foreground_fullscreen() {
        return;
    }
    let _ = window.set_focus();
}

#[tauri::command]
fn clipboard_text() -> String {
    win32::clipboard_text().unwrap_or_default()
}

#[tauri::command]
fn save_preview(state: State<PetState>, name: String, data_url: String) -> Result<(), String> {
    let dir = state.data.join("preview");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe: String = name.chars().map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' }).collect();
    fs::write(dir.join(format!("{safe}.png")), decode_data_url(&data_url)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn preview_done(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn watch_keys(value: bool) {
    WATCH_KEYS.store(value, Ordering::Relaxed);
}

#[tauri::command]
async fn desktop_icons() -> Vec<desktop::DesktopIcon> {
    if STREAMER.load(Ordering::Relaxed) {
        return Vec::new();
    }
    // Win32 scanning blocks: keep it off the async executor.
    tauri::async_runtime::spawn_blocking(|| {
        win32::make_thread_dpi_aware();
        let monitors = win32::monitors();
        let Some(m) = monitors.get(DISPLAY.load(Ordering::Relaxed).min(monitors.len().saturating_sub(1))) else {
            return Vec::new();
        };
        desktop::scan((m.work.left, m.work.top, m.work.right, m.work.bottom))
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
fn open_desktop_item(path: String) -> Result<(), String> {
    desktop::open(&path)
}

fn current_work() -> Option<win32::Rect> {
    let monitors = win32::monitors();
    monitors.get(DISPLAY.load(Ordering::Relaxed).min(monitors.len().saturating_sub(1))).map(|m| m.work)
}

// Every icon on the desktop (games or not, the Recycle Bin flagged), for her to play with.
#[tauri::command]
async fn desktop_all() -> Vec<desktop::DesktopIcon> {
    if STREAMER.load(Ordering::Relaxed) {
        return Vec::new();
    }
    tauri::async_runtime::spawn_blocking(|| {
        win32::make_thread_dpi_aware();
        let Some(w) = current_work() else { return Vec::new() };
        desktop::scan_all((w.left, w.top, w.right, w.bottom))
    })
    .await
    .unwrap_or_default()
}

// Moves a desktop icon by (dx, dy) physical pixels; returns where it was, to put it back.
#[tauri::command]
async fn move_icon(name: String, dx: i32, dy: i32) -> Option<(i32, i32)> {
    if STREAMER.load(Ordering::Relaxed) {
        return None;
    }
    tauri::async_runtime::spawn_blocking(move || {
        win32::make_thread_dpi_aware();
        desktop::move_icon(&name, dx, dy)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
async fn place_icon(name: String, x: i32, y: i32) -> bool {
    tauri::async_runtime::spawn_blocking(move || {
        win32::make_thread_dpi_aware();
        desktop::place_icon(&name, x, y)
    })
    .await
    .unwrap_or_default()
}

// x, y: physical pixels inside the overlay (the current monitor's work area).
#[tauri::command]
fn set_cursor(x: f64, y: f64) {
    if STREAMER.load(Ordering::Relaxed) {
        return;
    }
    // A game in fullscreen owns the mouse: moving it would break the game.
    if win32::foreground_fullscreen() {
        return;
    }
    win32::make_thread_dpi_aware();
    if let Some(w) = current_work() {
        win32::set_cursor_pos(w.left + x.round() as i32, w.top + y.round() as i32);
    }
}

#[tauri::command]
fn input_state() -> (u32, bool) {
    win32::input_state()
}

#[tauri::command]
fn set_display(index: usize) {
    DISPLAY.store(index, Ordering::Relaxed);
}

#[tauri::command]
fn audio_listen(app: AppHandle, value: bool) {
    audio::listen(app, value);
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn set_tray_icon(app: AppHandle, data_url: String) -> Result<(), String> {
    let bytes = decode_data_url(&data_url)?;
    let image = Image::from_bytes(&bytes).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_icon(Some(image)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(async)]
fn log(msg: String) {
    println!("{msg}");
    logfile::line("INFO", "app", &msg);
}

// Lines already formatted (and deduplicated) by the renderer, sent in batches.
#[tauri::command(async)]
fn log_lines(lines: Vec<String>) {
    logfile::write_lines(lines);
}

fn tray_menu<R: tauri::Runtime, M: Manager<R>>(m: &M, en: bool) -> tauri::Result<Menu<R>> {
    let t = |pt: &'static str, en_text: &'static str| if en { en_text } else { pt };
    let streamer = MenuItem::with_id(m, "streamer", t("Streamer Mode (liga/desliga)", "Streamer Mode (on/off)"), true, None::<&str>)?;
    let control = MenuItem::with_id(m, "open_control", t("Abrir Controle Streamer", "Open Streamer Control"), true, None::<&str>)?;
    let through = MenuItem::with_id(m, "through", t("Clicar através (liga/desliga)", "Click through (on/off)"), true, None::<&str>)?;
    let show_app = MenuItem::with_id(m, "show_app", t("Mostrar app de novo", "Show app again"), true, None::<&str>)?;
    let pause_mute = MenuItem::with_id(m, "pause_mute", t("Pausar & Silenciar", "Pause & Mute"), true, None::<&str>)?;
    let quit = MenuItem::with_id(m, "quit", t("Sair", "Quit"), true, None::<&str>)?;
    if STREAM_BUILD {
        Menu::with_items(m, &[&streamer, &control, &through, &pause_mute, &show_app, &quit])
    } else {
        Menu::with_items(m, &[&through, &pause_mute, &show_app, &quit])
    }
}

// Keeps the overlay covering the chosen monitor's work area and streams window geometry
// and the cursor position to the renderer.
// Global push-to-talk: polls the configured key and emits start/stop edges.
fn start_ptt_polling(app: AppHandle) {
    thread::spawn(move || {
        let mut down = false;
        loop {
            thread::sleep(Duration::from_millis(30));
            let now = win32::key_down(PTT_KEY.load(Ordering::Relaxed));
            if now && !down { let _ = app.emit("ptt-start", ()); }
            else if !now && down { let _ = app.emit("ptt-stop", ()); }
            down = now;
        }
    });
}

fn start_world_polling(app: AppHandle) {
    thread::spawn(move || {
        win32::make_thread_dpi_aware();
        let pid = std::process::id();
        let mut last_work = None;
        let mut tick: u64 = 0;
        let (mut left_down, mut right_down) = (false, false);
        // The monitor layout rarely changes: refresh it once per second (or when the display
        // changes) instead of querying the system 33 times per second.
        let mut monitors: Vec<win32::MonitorInfo> = Vec::new();
        let mut monitor_list: Vec<(i32, i32, i32, i32, bool)> = Vec::new();
        let mut mon_at: u64 = 0;
        let mut last_display = usize::MAX;
        // Foreground app: re-read only when the focused HWND actually changes.
        let mut last_hwnd: isize = 0;
        let mut active_app: Option<String> = None;
        // Last payload sent: identical frames are skipped (the renderer gets a 450 ms heartbeat).
        let mut last_world: Option<WorldOut> = None;
        loop {
            thread::sleep(Duration::from_millis(30));
            tick += 1;
            let Some(win) = app.get_webview_window(window_label(STREAMER.load(Ordering::Relaxed))) else { continue };
            let hwnd = win32::foreground_hwnd();
            if hwnd != last_hwnd {
                last_hwnd = hwnd;
                active_app = win32::foreground_title();
            }
            let wanted_display = DISPLAY.load(Ordering::Relaxed);
            if monitor_list.is_empty() || wanted_display != last_display || tick - mon_at >= 33 {
                monitors = win32::monitors();
                monitor_list = monitors
                    .iter()
                    .map(|m| (m.work.left, m.work.top, m.work.right - m.work.left, m.work.bottom - m.work.top, m.primary))
                    .collect();
                mon_at = tick;
                last_display = wanted_display;
            }
            let display = wanted_display.min(monitors.len().saturating_sub(1));
            let Some(mon) = monitors.get(display) else { continue };
            let work = mon.work;
            let bounds = mon.bounds;

            // Streamer Mode and the combat arena both use the window's client area as the world.
            if STREAMER.load(Ordering::Relaxed) || COMBATE.load(Ordering::Relaxed) {
                last_work = None;
                if win.is_minimized().unwrap_or(false) {
                    continue;
                }
                let (Ok(pos), Ok(size)) = (win.inner_position(), win.inner_size()) else { continue };
                if size.width < 80 || size.height < 80 {
                    continue;
                }
                let cursor = win32::cursor_pos().map(|(x, y)| ((x - pos.x) as f64, (y - pos.y) as f64));
                let keys = WATCH_KEYS.load(Ordering::Relaxed).then(|| {
                    (
                        win32::key_pressed(0x25, &mut left_down) as u32,
                        win32::key_pressed(0x27, &mut right_down) as u32,
                    )
                });
                let out = WorldOut {
                    width: size.width as f64,
                    height: size.height as f64,
                    windows: Vec::new(),
                    fullscreen: false,
                    active_app: active_app.clone(),
                    cursor,
                    keys,
                    monitors: monitor_list.clone(),
                    display,
                };
                if last_world.as_ref() != Some(&out) || tick % 15 == 0 {
                    let _ = app.emit("world", out.clone());
                }
                last_world = Some(out);
                continue;
            }

            if last_work != Some(work) {
                let _ = win.set_position(PhysicalPosition::new(work.left, work.top));
                let _ = win.set_size(PhysicalSize::new((work.right - work.left) as u32, (work.bottom - work.top) as u32));
                last_work = Some(work);
            }

            // Rects stay in physical pixels; the renderer divides by its devicePixelRatio, the only
            // reliable scale under Windows custom scaling (Win32 DPI queries report 96 there).
            let mut windows = Vec::new();
            let mut fullscreen = false;
            for w in win32::list_windows(pid) {
                let r = w.rect;
                if windows.is_empty()
                    && r.left <= bounds.left
                    && r.top <= bounds.top
                    && r.right >= bounds.right
                    && r.bottom >= bounds.bottom
                {
                    fullscreen = true;
                }
                if r.right < work.left || r.left > work.right || r.bottom < work.top || r.top > work.bottom {
                    continue;
                }
                windows.push(WindowOut {
                    id: w.id.to_string(),
                    x: (r.left - work.left) as f64,
                    y: (r.top - work.top) as f64,
                    w: (r.right - r.left) as f64,
                    h: (r.bottom - r.top) as f64,
                    maximized: w.maximized,
                    active: w.active,
                });
            }

            // Discord and other topmost apps steal the z-order; re-assert often — but never fight
            // a fullscreen game for it.
            if ON_TOP.load(Ordering::Relaxed) && tick % 15 == 0 && !fullscreen {
                let _ = win.set_always_on_top(true);
                if let Ok(h) = win.hwnd() {
                    win32::keep_topmost(h.0 as _);
                }
            }

            let cursor = win32::cursor_pos().map(|(x, y)| ((x - work.left) as f64, (y - work.top) as f64));
            let keys = WATCH_KEYS.load(Ordering::Relaxed).then(|| {
                (
                    win32::key_pressed(0x25, &mut left_down) as u32,
                    win32::key_pressed(0x27, &mut right_down) as u32,
                )
            });
            let out = WorldOut {
                width: (work.right - work.left) as f64,
                height: (work.bottom - work.top) as f64,
                windows,
                fullscreen,
                active_app: active_app.clone(),
                cursor,
                keys,
                monitors: monitor_list.clone(),
                display,
            };
            // Same cursor/windows/monitors as the last frame: skip the IPC (heartbeat every ~450 ms).
            if last_world.as_ref() != Some(&out) || tick % 15 == 0 {
                let _ = app.emit("world", out.clone());
            }
            last_world = Some(out);
        }
    });
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let preview = args.iter().any(|a| a == "--preview");
    let shots = args.iter().find_map(|a| a.strip_prefix("--shots=")).map(parse_shots);
    // The arena build runs isolated fights: same engine, own player folder, no overlay.
    let exe_name = std::env::current_exe()
        .ok()
        .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().to_lowercase()))
        .unwrap_or_default();
    let combate = !preview && (args.iter().any(|a| a == "--combate")
        || exe_name.contains("combate") || exe_name.contains("combat"));
    COMBATE.store(combate, Ordering::Relaxed);
    let root = find_root();
    let data = find_data(&root, combate);
    let mut config = load_config(&data);
    DISPLAY.store(config["display"].as_u64().unwrap_or(0) as usize, Ordering::Relaxed);
    // Always boot in Normal Mode. A previous session may have ended in Streamer Mode;
    // clear the persisted flag before anything else reads it.
    if config["streamer"].as_bool() == Some(true) {
        config["streamer"] = json!(false);
        if let Ok(text) = serde_json::to_string_pretty(&config) {
            let _ = fs::write(data.join("config.json"), text);
        }
    }
    let streamer = false;
    STREAMER.store(streamer, Ordering::Relaxed);
    STREAMER_OPAQUE.store(streamer && streamer_opaque(&config), Ordering::Relaxed);
    let lang_en = config["lang"].as_str() == Some("en");
    if !preview {
        logfile::init(&data, config["debug"].as_bool() == Some(true));
        let prev = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            logfile::panic_line(&format!("panic: {info}"));
            prev(info);
        }));
    }

    let mut builder = tauri::Builder::default();
    if !preview && !combate {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(win) = app.get_webview_window(window_label(STREAMER.load(Ordering::Relaxed))) {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }));
    }
    builder
        .plugin(tauri_plugin_dialog::init())
        .manage(PetState { root, data, config: Mutex::new(config.clone()), shots, autostarted: args.iter().any(|a| a == "--autostart") })
        .invoke_handler(tauri::generate_handler![
            get_config,
            pass_click,
            set_on_top,
            save_config,
            load_model,
            load_model_dir,
            install_side_model,
            pick_model_source,
            inspect_model,
            import_model,
            load_save,
            store_save,
            export_save,
            import_save,
            reset_save,
            get_autostart,
            set_autostart,
            make_report,
            set_interactive,
            set_streamer,
            open_streamer_control,
            streamer_rpc,
            streamer_take_rpc,
            ai_reply,
            list_open_windows,
            open_streamer_panel,
            streamer_push_state,
            tts_voices,
            tts_speak,
            tts_speak_remote,
            tts_quota,
            tts_stop,
            stream_bridge_start,
            stream_bridge_stop,
            focus_window,
            clipboard_text,
            watch_keys,
            set_display,
            desktop_icons,
            open_desktop_item,
            desktop_all,
            move_icon,
            place_icon,
            set_cursor,
            input_state,
            audio_listen,
            save_preview,
            preview_done,
            quit,
            set_tray_icon,
            pick_file,
            read_file_data,
            fetch_midi,
            read_zip,
            store_blob,
            load_blob,
            import_mc_skin,
            list_models,
            delete_model,
            log,
            log_lines
        ])
        .setup(move |app| {
            let _ = APP.set(app.handle().clone());
            // Normal window only: never open the browser control panel on boot.
            build_window(app, false, preview, combate, &config)?;
            if !preview && !combate {
                let menu = tray_menu(app, lang_en)?;
                let mut tray = TrayIconBuilder::with_id("main").tooltip(APP_NAME).menu(&menu).on_menu_event(
                    |app, event| {
                        if event.id() == "quit" {
                            app.exit(0);
                        } else if event.id() == "show_app" {
                            let _ = app.emit("tray_click", ());
                        } else if event.id() == "streamer" {
                            let _ = app.emit("streamer", !STREAMER.load(Ordering::Relaxed));
                        } else if event.id() == "open_control" {
                            let _ = open_streamer_panel(app.clone(), app.state::<PetState>(), "tab".into());
                        } else if event.id() == "through" {
                            let _ = app.emit("click-through", ());
                        } else if event.id() == "pause_mute" {
                            let on = !PAUSE_MUTE.load(Ordering::Relaxed);
                            PAUSE_MUTE.store(on, Ordering::Relaxed);
                            let _ = app.emit("tray-pause-mute", on);
                        }
                    },
                );
                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }
                tray = tray.on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            let _ = tray.app_handle().emit("tray_click", ());
                        }
                    }
                });
                tray.build(app)?;
            }
            if !preview {
                if let Some(key) = config.get("pttKey").and_then(Value::as_str) {
                    PTT_KEY.store(ptt_vk(key), Ordering::Release);
                }
                // Global PTT key capture is available in the plain (non-streamer) edition too.
                // app.emit() broadcasts the edge to every window, including the main one.
                start_ptt_polling(app.handle().clone());
                start_world_polling(app.handle().clone());
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build My Persocon")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if STREAMER.load(Ordering::Relaxed) {
                    // Never close the browser window here: only tell the panel tab to close.
                    stream_bridge::mark_closing();
                }
                let _ = app;
            }
        });
}
