// Linux fallback for desktop-icon manipulation: no Shell COM automation here, so scanning
// returns an empty list and open() delegates to xdg-open. Safe, never panics.
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct DesktopIcon {
    pub name: String,
    pub path: String,
    pub game: bool,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub icon: Option<String>,
    pub bin: bool,
}

pub fn scan(_work: (i32, i32, i32, i32)) -> Vec<DesktopIcon> { Vec::new() }
pub fn scan_all(_work: (i32, i32, i32, i32)) -> Vec<DesktopIcon> { Vec::new() }
pub fn move_icon(_name: &str, _dx: i32, _dy: i32) -> Option<(i32, i32)> { None }
pub fn place_icon(_name: &str, _x: i32, _y: i32) -> bool { false }

pub fn open(path: &str) -> Result<(), String> {
    std::process::Command::new("xdg-open").arg(path).spawn()
        .map(|_| ())
        .map_err(|e| format!("xdg-open falhou: {e}"))
}
