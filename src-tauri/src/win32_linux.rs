// Linux fallback for the Win32 helpers. The alpha has no X11 desktop/window hooks: return
// safe empty values so every caller keeps working (no panics, no missing symbols).
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

pub struct WindowInfo {
    pub id: isize,
    pub rect: Rect,
    pub maximized: bool,
    pub active: bool,
}

pub struct MonitorInfo {
    pub bounds: Rect,
    pub work: Rect,
    pub primary: bool,
}

fn screen(size: (u32, u32)) -> Rect {
    Rect { left: 0, top: 0, right: size.0 as i32, bottom: size.1 as i32 }
}

pub fn monitors() -> Vec<MonitorInfo> {
    // No X11/RandR probing in the alpha: one logical 1280×720 work area is enough for layout.
    let r = screen((1280, 720));
    vec![MonitorInfo { bounds: r, work: r, primary: true }]
}

pub fn make_thread_dpi_aware() {}
pub fn foreground_hwnd() -> isize { 0 }
pub fn foreground_title() -> Option<String> { None }
pub fn foreground_fullscreen() -> bool { false }
pub fn list_open_windows() -> Vec<(String, String)> { Vec::new() }
pub fn close_windows_containing(_needle: &str) -> usize { 0 }
pub fn list_windows(_ignore_pid: u32) -> Vec<WindowInfo> { Vec::new() }
pub fn cursor_pos() -> Option<(i32, i32)> { None }
pub fn set_cursor_pos(_x: i32, _y: i32) {}
pub fn input_state() -> (u32, bool) { (0, false) }
pub fn resend_left_down() {}
pub fn key_pressed(_vk: u16, _was_down: &mut bool) -> bool { false }
pub fn key_down(_vk: i32) -> bool { false }
pub fn clipboard_text() -> Option<String> { None }
pub fn set_tool_window(_h: isize) {}
pub fn keep_topmost(_h: isize) {}
