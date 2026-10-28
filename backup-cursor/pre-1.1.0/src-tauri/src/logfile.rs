// Debug log: log/AAAA-MM-DD.log next to config.json, only while config.debug is on.
// At most MAX_FILES files (oldest deleted); a day over MAX_BYTES moves to AAAA-MM-DD.1.log.

use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use windows_sys::Win32::{Foundation::SYSTEMTIME, System::SystemInformation::GetLocalTime};

const MAX_FILES: usize = 5;
const MAX_BYTES: u64 = 2 * 1024 * 1024;

static ENABLED: AtomicBool = AtomicBool::new(false);
static LOG: Mutex<Option<Logger>> = Mutex::new(None);

struct Logger {
    dir: PathBuf,
    day: String,
    out: Option<BufWriter<File>>,
    size: u64,
}

// (AAAA-MM-DD, HH:MM:SS.mmm) in local time.
fn now() -> (String, String) {
    let mut t: SYSTEMTIME = unsafe { std::mem::zeroed() };
    unsafe { GetLocalTime(&mut t) };
    (
        format!("{:04}-{:02}-{:02}", t.wYear, t.wMonth, t.wDay),
        format!("{:02}:{:02}:{:02}.{:03}", t.wHour, t.wMinute, t.wSecond, t.wMilliseconds),
    )
}

pub fn init(root: &Path, enabled: bool) {
    let _ = fs::remove_file(root.join("pet.log"));
    *LOG.lock().unwrap_or_else(|e| e.into_inner()) = Some(Logger { dir: root.join("log"), day: String::new(), out: None, size: 0 });
    set_enabled(enabled);
}

pub fn set_enabled(on: bool) {
    let was = ENABLED.swap(on, Ordering::Relaxed);
    if on && !was {
        line("INFO", "app", &format!("=== debug ligado · Persocon v{} ===", env!("CARGO_PKG_VERSION")));
    } else if !on && was {
        if let Some(l) = LOG.lock().unwrap_or_else(|e| e.into_inner()).as_mut() {
            if let Some(mut o) = l.out.take() {
                let _ = o.flush();
            }
        }
    }
}

pub fn line(level: &str, module: &str, msg: &str) {
    let (_, t) = now();
    write_lines([format!("{t} [{level}] [{module}] {msg}")]);
}

pub fn write_lines<I: IntoIterator<Item = String>>(lines: I) {
    if !ENABLED.load(Ordering::Relaxed) {
        return;
    }
    let mut guard = LOG.lock().unwrap_or_else(|e| e.into_inner());
    write_to(guard.as_mut(), lines);
}

// From the panic hook: never waits for (or deadlocks on) the lock.
pub fn panic_line(msg: &str) {
    if !ENABLED.load(Ordering::Relaxed) {
        return;
    }
    if let Ok(mut guard) = LOG.try_lock() {
        let (_, t) = now();
        write_to(guard.as_mut(), [format!("{t} [ERROR] [rust] {msg}")]);
    }
}

fn write_to<I: IntoIterator<Item = String>>(logger: Option<&mut Logger>, lines: I) {
    let Some(l) = logger else { return };
    let (day, _) = now();
    for s in lines {
        l.write(&day, &s);
    }
    if let Some(o) = l.out.as_mut() {
        let _ = o.flush();
    }
}

impl Logger {
    fn path(&self, suffix: &str) -> PathBuf {
        self.dir.join(format!("{}{suffix}.log", self.day))
    }

    fn write(&mut self, day: &str, s: &str) {
        if self.day != day || self.out.is_none() {
            self.open(day);
        }
        let n = s.len() as u64 + 1;
        if self.size > 0 && self.size + n > MAX_BYTES {
            self.rotate();
        }
        if let Some(o) = self.out.as_mut() {
            if writeln!(o, "{s}").is_ok() {
                self.size += n;
            }
        }
    }

    fn open(&mut self, day: &str) {
        if let Some(mut o) = self.out.take() {
            let _ = o.flush();
        }
        self.day = day.to_string();
        let _ = fs::create_dir_all(&self.dir);
        let p = self.path("");
        self.size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
        self.out = OpenOptions::new().create(true).append(true).open(&p).ok().map(|f| BufWriter::with_capacity(16 * 1024, f));
        self.prune();
    }

    fn rotate(&mut self) {
        if let Some(mut o) = self.out.take() {
            let _ = o.flush();
        }
        let p = self.path("");
        let _ = fs::rename(&p, self.path(".1"));
        self.size = 0;
        self.out = File::create(&p).ok().map(|f| BufWriter::with_capacity(16 * 1024, f));
        self.prune();
    }

    // Names are dates, so sorting by name is oldest first ("…12.1.log" before "…12.log").
    fn prune(&self) {
        let Ok(dir) = fs::read_dir(&self.dir) else { return };
        let mut files: Vec<PathBuf> = dir
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.extension().map_or(false, |e| e.eq_ignore_ascii_case("log"))
                    && p.file_name().and_then(|n| n.to_str()).map_or(false, |n| n.starts_with(|c: char| c.is_ascii_digit()))
            })
            .collect();
        files.sort();
        let extra = files.len().saturating_sub(MAX_FILES);
        for p in &files[..extra] {
            let _ = fs::remove_file(p);
        }
    }
}
