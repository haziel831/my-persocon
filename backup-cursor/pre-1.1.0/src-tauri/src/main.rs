#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod desktop;
mod logfile;
mod model_io;
mod win32;

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Mutex,
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

static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

struct PetState {
    root: PathBuf,
    config: Mutex<Value>,
    shots: Option<Value>,
}

#[derive(Serialize, Clone)]
struct WindowOut {
    id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    maximized: bool,
    active: bool,
}

#[derive(Serialize, Clone)]
struct WorldOut {
    width: f64,
    height: f64,
    windows: Vec<WindowOut>,
    fullscreen: bool,
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
static STREAMER: AtomicBool = AtomicBool::new(false);

fn default_config() -> Value {
    json!({
        "name": "Kurumi",
        "modelDir": "DaL_Kurumi",
        "display": "primary",
        "petHeight": 110,
        "walkSpeed": 0.5,
        "runSpeed": 1.4,
        "climbSpeed": 0.5,
        "gravity": 16,
        "jumpReach": 1.6,
        "climbChance": 0.6,
        "emotes": ["extra0", "extra1", "extra2", "extra3", "extra4", "extra6"],
        "emoticons": true,
        "emoticonRate": 1.0,
        "emoticonScale": 0.5,
        "emoticonOffsetX": -28,
        "emoticonOffsetY": 12,
        "emotePack": "gif",
        "difficulty": "normal",
        "sound": true,
        "volume": 0.3,
        "gbVolume": 0.25,
        "footsteps": false,
        "defaultsRev": 1,
        "debug": false
    })
}

// config.json and the model folder live next to the .exe; in development they are a few levels up.
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
        .find(|d| d.join("config.json").exists())
        .cloned()
        .unwrap_or_else(|| candidates.first().cloned().unwrap_or_default())
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
    let config = state.config.lock().unwrap();
    let dir = config["modelDir"].as_str().unwrap_or("DaL_Kurumi");
    if Path::new(dir).is_absolute() { PathBuf::from(dir) } else { state.root.join(dir) }
}

#[tauri::command]
fn get_config(state: State<PetState>) -> Value {
    let mut config = state.config.lock().unwrap().clone();
    if let Some(shots) = &state.shots {
        config["previewShots"] = shots.clone();
    }
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
    let mut config = state.config.lock().unwrap();
    if let Value::Object(p) = patch {
        for (k, v) in p {
            config[k] = v;
        }
    }
    let text = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
    fs::write(state.root.join("config.json"), text).map_err(|e| e.to_string())?;
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

#[tauri::command]
fn load_model(state: State<PetState>) -> Result<Value, String> {
    let dir = model_dir(&state);
    if dir.join("mc.json").is_file() {
        let skin = fs::read(dir.join("skin.png")).map_err(|e| e.to_string())?;
        let meta: Value = serde_json::from_str(&fs::read_to_string(dir.join("mc.json")).unwrap_or_default()).unwrap_or(Value::Null);
        return Ok(json!({ "mcSkin": format!("data:image/png;base64,{}", STANDARD.encode(&skin)), "slim": meta["slim"].as_bool().unwrap_or(false) }));
    }
    if let Some(f) = vrm_file(&dir) {
        return Ok(vrm_data(&f)?.1);
    }
    Ok(model_io::load(&dir)?.render_data(None))
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
        let safe: String = name.chars().map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect();
        let dir = state.root.join("models").join(if safe.is_empty() { "vroid".to_string() } else { safe });
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        fs::copy(&f, dir.join("model.vrm")).map_err(|e| e.to_string())?;
        dir
    } else {
        model_io::load(Path::new(&path))?.install(&state.root.join("models"), &name, texture.as_deref())?
    };
    let rel = dir.strip_prefix(&state.root).unwrap_or(&dir).to_string_lossy().replace('\\', "/");
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

fn safe_name(name: &str) -> String {
    name.chars().map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect()
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

// Entries of a zip (a Minecraft resourcepack) under any of the given prefixes, as data URLs.
#[tauri::command]
async fn read_zip(path: String, prefixes: Vec<String>, max_files: usize) -> Result<Value, String> {
    use std::io::Read;
    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("zip inválido: {e}"))?;
    let mut out = serde_json::Map::new();
    let mut names = Vec::new();
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).map_err(|e| e.to_string())?;
        if !f.is_file() {
            continue;
        }
        let name = f.name().replace('\\', "/");
        names.push(json!(name));
        if out.len() >= max_files || !prefixes.iter().any(|p| name.starts_with(p.as_str())) {
            continue;
        }
        let mut bytes = Vec::new();
        f.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        out.insert(name.clone(), json!(format!("data:{};base64,{}", mime_of(&name), STANDARD.encode(&bytes))));
    }
    Ok(json!({ "files": out, "names": names }))
}

// Big data (resourcepack, imported object skins) kept as JSON files next to the save.
#[tauri::command]
fn store_blob(state: State<PetState>, name: String, data: Value) -> Result<(), String> {
    let dir = state.root.join("data");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{}.json", safe_name(&name))), serde_json::to_vec(&data).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_blob(state: State<PetState>, name: String) -> Option<Value> {
    let text = fs::read(state.root.join("data").join(format!("{}.json", safe_name(&name)))).ok()?;
    serde_json::from_slice(&text).ok()
}

// Minecraft skin as the pet: the renderer builds the model and animations from the skin.
#[tauri::command]
fn import_mc_skin(state: State<PetState>, name: String, skin: String, slim: bool, pet_height: Option<f64>) -> Result<Value, String> {
    let safe = safe_name(&name);
    let dir = state.root.join("models").join(if safe.is_empty() { "minecraft".to_string() } else { safe });
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("skin.png"), decode_data_url(&skin)?).map_err(|e| e.to_string())?;
    fs::write(dir.join("mc.json"), json!({ "slim": slim }).to_string()).map_err(|e| e.to_string())?;
    let rel = dir.strip_prefix(&state.root).unwrap_or(&dir).to_string_lossy().replace('\\', "/");
    let mut patch = json!({ "modelDir": rel, "name": name });
    if let Some(h) = pet_height {
        patch["petHeight"] = json!(h.round());
    }
    save_config(state, patch)
}

// Models already installed (the bundled one and everything under models/), to switch back quickly.
#[tauri::command]
fn list_models(state: State<PetState>) -> Vec<Value> {
    let mut dirs = vec![state.root.join("DaL_Kurumi")];
    if let Ok(rd) = fs::read_dir(state.root.join("models")) {
        dirs.extend(rd.flatten().map(|e| e.path()).filter(|p| p.is_dir()));
    }
    dirs.into_iter()
        .filter(|d| d.is_dir())
        .map(|d| {
            let kind = if d.join("mc.json").is_file() { "mc" } else if vrm_file(&d).is_some() { "vrm" } else { "ysm" };
            let rel = d.strip_prefix(&state.root).unwrap_or(&d).to_string_lossy().replace('\\', "/");
            let name = d.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
            let modified = fs::metadata(&d)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|t| t.as_secs())
                .unwrap_or(0);
            let skin = if kind == "mc" { fs::read(d.join("skin.png")).ok().map(|b| format!("data:image/png;base64,{}", STANDARD.encode(&b))) } else { None };
            json!({ "dir": rel, "name": name, "kind": kind, "modified": modified, "skin": skin })
        })
        .collect()
}

#[tauri::command]
fn load_save(state: State<PetState>) -> Option<Value> {
    let text = fs::read_to_string(state.root.join("save.json")).ok()?;
    serde_json::from_str(&text).ok()
}

#[tauri::command]
fn store_save(state: State<PetState>, data: Value) -> Result<(), String> {
    let path = state.root.join("save.json");
    let tmp = state.root.join("save.json.tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_emoticons(state: State<PetState>) -> Vec<Value> {
    let dir = state.root.join("emoticons");
    let mut out: Vec<Value> = fs::read_dir(dir)
        .map(|rd| {
            rd.flatten()
                .filter_map(|e| {
                    let path = e.path();
                    let ext = path.extension()?.to_str()?.to_lowercase();
                    let mime = match ext.as_str() {
                        "gif" => "image/gif",
                        "png" => "image/png",
                        "webp" => "image/webp",
                        _ => return None,
                    };
                    let bytes = fs::read(&path).ok()?;
                    Some(json!({
                        "name": path.file_stem()?.to_string_lossy(),
                        "data": format!("data:{mime};base64,{}", STANDARD.encode(bytes)),
                    }))
                })
                .collect()
        })
        .unwrap_or_default();
    out.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
    out
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

// The overlay ("main") or the Streamer Mode window ("stream"). Switching modes builds a fresh
// window: OBS keeps its yellow capture border on a window for as long as it captures it.
fn build_window<M: Manager<tauri::Wry>>(app: &M, streamer: bool, preview: bool) -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, window_label(streamer), WebviewUrl::App("index.html".into()))
        .transparent(true)
        // Defaults Tauri passes to WebView2, plus sound without a prior click; the rest keeps the
        // page painting when hidden behind other windows (OBS captures it there).
        .additional_browser_args(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion \
             --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
             --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        )
        .visible(!preview)
        .initialization_script(if preview { "window.__PET_PREVIEW__ = true;" } else { "" });
    let win = if streamer {
        builder
            .title("Persocon - Streamer Mode")
            .inner_size(1280.0, 720.0)
            .center()
            .focused(true)
            .build()?
    } else {
        builder
            .title("Persocon")
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
    } else if !preview {
        win.set_ignore_cursor_events(true)?;
        if let Ok(h) = win.hwnd() {
            win32::set_tool_window(h.0 as _);
        }
    }
    Ok(win)
}

#[tauri::command]
async fn set_streamer(app: AppHandle, value: bool) -> Result<(), String> {
    if STREAMER.swap(value, Ordering::Relaxed) == value {
        return Ok(());
    }
    let old = app.get_webview_window(window_label(!value));
    if let Err(e) = build_window(&app, value, false) {
        STREAMER.store(!value, Ordering::Relaxed);
        return Err(e.to_string());
    }
    if let Some(w) = old {
        let _ = w.destroy();
    }
    Ok(())
}

#[tauri::command]
fn focus_window(window: WebviewWindow) {
    let _ = window.set_focus();
}

#[tauri::command]
fn save_preview(state: State<PetState>, name: String, data_url: String) -> Result<(), String> {
    let dir = state.root.join("preview");
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
    win32::make_thread_dpi_aware();
    let monitors = win32::monitors();
    let Some(m) = monitors.get(DISPLAY.load(Ordering::Relaxed).min(monitors.len().saturating_sub(1))) else { return Vec::new() };
    desktop::scan((m.work.left, m.work.top, m.work.right, m.work.bottom))
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
    win32::make_thread_dpi_aware();
    let Some(w) = current_work() else { return Vec::new() };
    desktop::scan_all((w.left, w.top, w.right, w.bottom))
}

// Moves a desktop icon by (dx, dy) physical pixels; returns where it was, to put it back.
#[tauri::command]
async fn move_icon(name: String, dx: i32, dy: i32) -> Option<(i32, i32)> {
    if STREAMER.load(Ordering::Relaxed) {
        return None;
    }
    win32::make_thread_dpi_aware();
    desktop::move_icon(&name, dx, dy)
}

#[tauri::command]
async fn place_icon(name: String, x: i32, y: i32) -> bool {
    win32::make_thread_dpi_aware();
    desktop::place_icon(&name, x, y)
}

// x, y: physical pixels inside the overlay (the current monitor's work area).
#[tauri::command]
fn set_cursor(x: f64, y: f64) {
    if STREAMER.load(Ordering::Relaxed) {
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
    let through = MenuItem::with_id(m, "through", t("Clicar através (liga/desliga)", "Click through (on/off)"), true, None::<&str>)?;
    let quit = MenuItem::with_id(m, "quit", t("Sair", "Quit"), true, None::<&str>)?;
    Menu::with_items(m, &[&streamer, &through, &quit])
}

// Keeps the overlay covering the chosen monitor's work area and streams window geometry
// and the cursor position to the renderer.
fn start_world_polling(app: AppHandle) {
    thread::spawn(move || {
        win32::make_thread_dpi_aware();
        let pid = std::process::id();
        let mut last_work = None;
        let mut tick: u64 = 0;
        let (mut left_down, mut right_down) = (false, false);
        loop {
            thread::sleep(Duration::from_millis(30));
            tick += 1;
            let Some(win) = app.get_webview_window(window_label(STREAMER.load(Ordering::Relaxed))) else { continue };
            let monitors = win32::monitors();
            let display = DISPLAY.load(Ordering::Relaxed).min(monitors.len().saturating_sub(1));
            let Some(mon) = monitors.get(display) else { continue };
            let work = mon.work;
            let bounds = mon.bounds;
            let monitor_list: Vec<(i32, i32, i32, i32, bool)> = monitors
                .iter()
                .map(|m| (m.work.left, m.work.top, m.work.right - m.work.left, m.work.bottom - m.work.top, m.primary))
                .collect();

            if STREAMER.load(Ordering::Relaxed) {
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
                let _ = app.emit(
                    "world",
                    WorldOut {
                        width: size.width as f64,
                        height: size.height as f64,
                        windows: Vec::new(),
                        fullscreen: false,
                        cursor,
                        keys,
                        monitors: monitor_list,
                        display,
                    },
                );
                continue;
            }

            if last_work != Some(work) {
                let _ = win.set_position(PhysicalPosition::new(work.left, work.top));
                let _ = win.set_size(PhysicalSize::new((work.right - work.left) as u32, (work.bottom - work.top) as u32));
                last_work = Some(work);
            }
            if tick % 100 == 0 && ON_TOP.load(Ordering::Relaxed) {
                let _ = win.set_always_on_top(true);
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

            let cursor = win32::cursor_pos().map(|(x, y)| ((x - work.left) as f64, (y - work.top) as f64));
            let keys = WATCH_KEYS.load(Ordering::Relaxed).then(|| {
                (
                    win32::key_pressed(0x25, &mut left_down) as u32,
                    win32::key_pressed(0x27, &mut right_down) as u32,
                )
            });
            let _ = app.emit(
                "world",
                WorldOut {
                    width: (work.right - work.left) as f64,
                    height: (work.bottom - work.top) as f64,
                    windows,
                    fullscreen,
                    cursor,
                    keys,
                    monitors: monitor_list,
                    display,
                },
            );
        }
    });
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let preview = args.iter().any(|a| a == "--preview");
    let shots = args.iter().find_map(|a| a.strip_prefix("--shots=")).map(parse_shots);
    let root = find_root();
    let config = load_config(&root);
    DISPLAY.store(config["display"].as_u64().unwrap_or(0) as usize, Ordering::Relaxed);
    STREAMER.store(!preview && config["streamer"].as_bool() == Some(true), Ordering::Relaxed);
    let lang_en = config["lang"].as_str() == Some("en");
    if !preview {
        logfile::init(&root, config["debug"].as_bool() == Some(true));
        let prev = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            logfile::panic_line(&format!("panic: {info}"));
            prev(info);
        }));
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PetState { root, config: Mutex::new(config), shots })
        .invoke_handler(tauri::generate_handler![
            get_config,
            pass_click,
            set_on_top,
            save_config,
            load_model,
            pick_model_source,
            inspect_model,
            import_model,
            load_emoticons,
            load_save,
            store_save,
            set_interactive,
            set_streamer,
            focus_window,
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
            read_zip,
            store_blob,
            load_blob,
            import_mc_skin,
            list_models,
            log,
            log_lines
        ])
        .setup(move |app| {
            let _ = APP.set(app.handle().clone());
            build_window(app, STREAMER.load(Ordering::Relaxed), preview)?;
            if !preview {
                let menu = tray_menu(app, lang_en)?;
                let mut tray = TrayIconBuilder::with_id("main").tooltip("Persocon").menu(&menu).on_menu_event(
                    |app, event| {
                        if event.id() == "quit" {
                            app.exit(0);
                        } else if event.id() == "streamer" {
                            let _ = app.emit("streamer", !STREAMER.load(Ordering::Relaxed));
                        } else if event.id() == "through" {
                            let _ = app.emit("click-through", ());
                        }
                    },
                );
                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }
                tray.build(app)?;
                start_world_polling(app.handle().clone());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Persocon");
}
