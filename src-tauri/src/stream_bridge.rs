// Tiny local-only HTTP bridge for stream alerts (Streamer.bot, SAMMI, OBS scripts...).
use serde_json::Value;
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

static RUNNING: AtomicBool = AtomicBool::new(false);
static STOP: Mutex<Option<TcpListener>> = Mutex::new(None);
static STATE: Mutex<Value> = Mutex::new(Value::Null);
const CONTROL_HTML: &str = include_str!("stream_control.html");

// Snapshot pushed by the stage window and polled by the browser control panel.
pub fn set_state(next: Value) {
    let mut state = STATE.lock().unwrap_or_else(|e| e.into_inner());
    if let Value::Object(patch) = &next {
        if let Value::Object(old) = &mut *state {
            for (k, v) in patch { old.insert(k.clone(), v.clone()); }
            return;
        }
    }
    *state = next;
}

pub fn state() -> Value {
    STATE.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

fn send(mut stream: TcpStream, status: &str, body: &str) {
    let _ = write!(stream, "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
}

fn options(mut stream: TcpStream) {
    let _ = write!(stream, "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-Token\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
}

fn send_body(mut stream: TcpStream, status: &str, content_type: &str, body: &str) {
    let _ = write!(stream, "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
}

fn find_bytes(hay: &[u8], needle: &[u8]) -> Option<usize> {
    hay.windows(needle.len()).position(|w| w == needle)
}

fn header_value(head: &[u8], wanted: &str) -> Option<String> {
    let text = String::from_utf8_lossy(head);
    text.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.eq_ignore_ascii_case(wanted) { Some(value.trim().to_string()) } else { None }
    })
}

fn token_ok(head: &[u8], token: &str) -> bool {
    if token.is_empty() { return true; }
    header_value(head, "x-token").map_or(false, |v| v == token)
}

// Reads until the header terminator and every byte announced by Content-Length.
// TCP can split a single POST across packets, so one read() is not enough.
fn read_request(stream: &mut TcpStream) -> Option<String> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let mut buf: Vec<u8> = Vec::with_capacity(2048);
    let mut chunk = [0u8; 1024];
    let (head_end, body_len) = loop {
        if let Some(pos) = find_bytes(&buf, b"\r\n\r\n") {
            let len = header_value(&buf[..pos], "content-length")
                .and_then(|v| v.parse::<usize>().ok())
                .unwrap_or(0);
            break (pos + 4, len);
        }
        if buf.len() >= 8192 { return None; }
        match stream.read(&mut chunk) {
            Ok(0) => return None,
            Ok(n) => buf.extend_from_slice(&chunk[..n]),
            Err(e) if e.kind() == ErrorKind::TimedOut => return None,
            Err(e) if e.kind() == ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(10)),
            Err(_) => return None,
        }
    };
    let total = head_end + body_len;
    if total > 8192 { return None; }
    while buf.len() < total {
        match stream.read(&mut chunk) {
            Ok(0) => return None,
            Ok(n) => buf.extend_from_slice(&chunk[..n]),
            Err(e) if e.kind() == ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(10)),
            Err(_) => return None,
        }
    }
    buf.truncate(total);
    Some(String::from_utf8_lossy(&buf).into_owned())
}

fn handle(mut stream: TcpStream, app: AppHandle, token: String) {
    let req = match read_request(&mut stream) { Some(r) => r, None => return };
    let first = req.lines().next().unwrap_or("");
    if first.starts_with("OPTIONS ") { return options(stream); }
    if first.starts_with("GET /state") {
        return send_body(stream, "200 OK", "application/json; charset=utf-8", &state().to_string());
    }
    if first.starts_with("GET /") {
        return send_body(stream, "200 OK", "text/html; charset=utf-8", CONTROL_HTML);
    }
    if first.starts_with("POST /rpc") {
        let head_end = req.find("\r\n\r\n").map(|p| p + 4).unwrap_or(req.len());
        let body = req[head_end..].trim();
        let mut payload: Value = match serde_json::from_str::<Value>(body) {
            Ok(v) if v.is_object() => v,
            _ => return send(stream, "400 Bad Request", "{\"ok\":false}"),
        };
        if let Some(obj) = payload.as_object_mut() {
            if !obj.contains_key("type") {
                if let Some(cmd) = obj.remove("cmd") { obj.insert("type".into(), cmd); }
            }
        }
        if let Some(w) = app.get_webview_window("stream") {
            let _ = w.emit("streamer-rpc", payload);
        } else {
            let _ = app.emit("streamer-rpc", payload);
        }
        return send(stream, "200 OK", "{\"ok\":true}");
    }
    if !first.starts_with("POST /event") { return send(stream, "404 Not Found", "{\"ok\":false}"); }
    let head_end = req.find("\r\n\r\n").map(|p| p + 4).unwrap_or(req.len());
    let head = &req.as_bytes()[..head_end];
    if !token_ok(head, &token) { return send(stream, "401 Unauthorized", "{\"ok\":false}"); }
    let body = req[head_end..].trim();
    let payload: Value = match serde_json::from_str::<Value>(body) {
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
    let _ = listener.set_nonblocking(true);
    *STOP.lock().unwrap_or_else(|e| e.into_inner()) = listener.try_clone().ok();
    std::thread::spawn(move || loop {
        if !RUNNING.load(Ordering::Relaxed) { break; }
        match listener.accept() {
            Ok((s, _)) => {
                let a = app.clone();
                let t = token.clone();
                thread::spawn(move || handle(s, a, t));
            }
            Err(e) if e.kind() == ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(40)),
            Err(_) => break,
        }
    });
    Ok(())
}

pub fn stop() {
    RUNNING.store(false, Ordering::Release);
    let mut g = STOP.lock().unwrap_or_else(|e| e.into_inner());
    *g = None;
}
