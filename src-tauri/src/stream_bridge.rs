// Tiny local-only HTTP bridge for stream alerts (Streamer.bot, SAMMI, OBS scripts...).
use serde_json::Value;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

static RUNNING: AtomicBool = AtomicBool::new(false);
static STOP: Mutex<Option<std::net::TcpListener>> = Mutex::new(None);

fn send(mut stream: TcpStream, status: &str, body: &str) {
    let _ = write!(stream, "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
}

fn handle(mut stream: TcpStream, app: AppHandle, token: String) {
    let mut buf = [0u8; 8192];
    let n = match stream.read(&mut buf) { Ok(n) => n, Err(_) => return };
    let req = String::from_utf8_lossy(&buf[..n]);
    if !req.starts_with("POST /event") {
        return send(stream, "404 Not Found", "{\"ok\":false}");
    }
    if !token.is_empty() && !req.to_ascii_lowercase().contains(&format!("x-token: {token}").to_ascii_lowercase()) {
        return send(stream, "401 Unauthorized", "{\"ok\":false}");
    }
    let body = req.split("\r\n\r\n").nth(1).unwrap_or("");
    let payload: Value = match serde_json::from_str::<Value>(body.trim()) {
        Ok(v) if v.is_object() => v,
        _ => return send(stream, "400 Bad Request", "{\"ok\":false}"),
    };
    let _ = app.emit("stream-event", payload);
    send(stream, "200 OK", "{\"ok\":true}")
}

pub fn start(app: AppHandle, port: u16, token: String) -> Result<(), String> {
    if RUNNING.swap(true, Ordering::AcqRel) { return Ok(()); }
    let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| {
        RUNNING.store(false, Ordering::Release);
        e.to_string()
    })?;
    let _ = listener.set_nonblocking(false);
    *STOP.lock().unwrap_or_else(|e| e.into_inner()) = listener.try_clone().ok();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if !RUNNING.load(Ordering::Relaxed) { break; }
            if let Ok(s) = stream {
                let a = app.clone();
                let t = token.clone();
                std::thread::spawn(move || handle(s, a, t));
            }
        }
    });
    Ok(())
}

pub fn stop() {
    RUNNING.store(false, Ordering::Release);
    if let Ok(mut g) = STOP.lock() { *g = None; }
}
