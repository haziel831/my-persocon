use std::mem::{size_of, zeroed};
use std::ptr::{null, null_mut};

use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, POINT, RECT, TRUE};
use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS};
use windows_sys::Win32::Graphics::Gdi::{EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFO};
use windows_sys::Win32::UI::HiDpi::{
    SetThreadDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
};
use windows_sys::Win32::UI::WindowsAndMessaging::*;

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl From<RECT> for Rect {
    fn from(r: RECT) -> Self {
        Rect { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
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

const IGNORED_CLASSES: &[&str] = &[
    "Progman",
    "WorkerW",
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd",
    "NotifyIconOverflowWindow",
    "Windows.UI.Core.CoreWindow",
    "ForegroundStaging",
    "MultitaskingViewFrame",
    "XamlExplorerHostIslandWindow",
    "TopLevelWindowForOverflowXamlIsland",
];

unsafe fn class_name(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let n = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    String::from_utf16_lossy(&buf[..n.max(0) as usize])
}

unsafe fn is_cloaked(hwnd: HWND) -> bool {
    let mut cloaked: u32 = 0;
    DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED as _, &mut cloaked as *mut u32 as *mut _, size_of::<u32>() as u32) == 0
        && cloaked != 0
}

unsafe fn frame_rect(hwnd: HWND) -> Option<Rect> {
    let mut r: RECT = zeroed();
    if DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS as _, &mut r as *mut RECT as *mut _, size_of::<RECT>() as u32) == 0 {
        return Some(r.into());
    }
    if GetWindowRect(hwnd, &mut r) != 0 {
        return Some(r.into());
    }
    None
}

/// Visible top-level app windows, topmost first. Rects are physical screen pixels.
pub fn list_windows(ignore_pid: u32) -> Vec<WindowInfo> {
    let mut out = Vec::new();
    unsafe {
        let fg = GetForegroundWindow();
        let mut hwnd = GetTopWindow(null_mut());
        let mut guard = 0;
        while !hwnd.is_null() && guard < 4000 {
            guard += 1;
            let h = hwnd;
            hwnd = GetWindow(h, GW_HWNDNEXT);

            if IsWindowVisible(h) == 0 || IsIconic(h) != 0 {
                continue;
            }
            let style = GetWindowLongW(h, GWL_STYLE) as u32;
            if style & WS_CHILD != 0 {
                continue;
            }
            let ex = GetWindowLongW(h, GWL_EXSTYLE) as u32;
            if ex & WS_EX_TRANSPARENT != 0 {
                continue;
            }
            if ex & (WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) != 0 && ex & WS_EX_APPWINDOW == 0 {
                continue;
            }
            if GetWindowTextLengthW(h) == 0 {
                continue;
            }
            // Cheap check first: DWM and class-name lookups cost a lot more than a query.
            let mut pid = 0u32;
            GetWindowThreadProcessId(h, &mut pid);
            if pid == ignore_pid {
                continue;
            }
            if IGNORED_CLASSES.contains(&class_name(h).as_str()) || is_cloaked(h) {
                continue;
            }
            let Some(rect) = frame_rect(h) else { continue };
            if rect.right - rect.left < 60 || rect.bottom - rect.top < 40 {
                continue;
            }
            out.push(WindowInfo { id: h as isize, rect, maximized: IsZoomed(h) != 0, active: h == fg });
        }
    }
    out
}

unsafe extern "system" fn collect_monitor(hm: HMONITOR, _hdc: HDC, _clip: *mut RECT, data: LPARAM) -> BOOL {
    let list = &mut *(data as *mut Vec<MonitorInfo>);
    let mut mi: MONITORINFO = zeroed();
    mi.cbSize = size_of::<MONITORINFO>() as u32;
    if GetMonitorInfoW(hm, &mut mi) != 0 {
        list.push(MonitorInfo {
            bounds: mi.rcMonitor.into(),
            work: mi.rcWork.into(),
            primary: mi.dwFlags & MONITORINFOF_PRIMARY != 0,
        });
    }
    TRUE
}

/// Cursor position in physical screen pixels.
pub fn cursor_pos() -> Option<(i32, i32)> {
    unsafe {
        let mut p: POINT = zeroed();
        (GetCursorPos(&mut p) != 0).then_some((p.x, p.y))
    }
}

/// Moves the cursor (physical screen pixels).
pub fn set_cursor_pos(x: i32, y: i32) {
    unsafe {
        SetCursorPos(x, y);
    }
}

/// Tick of the last keyboard/mouse input of the session and whether a mouse button is held.
pub fn input_state() -> (u32, bool) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, GetLastInputInfo, LASTINPUTINFO};
    unsafe {
        let mut li: LASTINPUTINFO = zeroed();
        li.cbSize = size_of::<LASTINPUTINFO>() as u32;
        GetLastInputInfo(&mut li);
        let down = |vk: i32| (GetAsyncKeyState(vk) as u16) & 0x8000 != 0;
        (li.dwTime, down(1) || down(2) || down(4))
    }
}

/// Presses the left button again where the cursor is, so it lands on whatever is under the window
/// (call after the window started ignoring the mouse).
pub fn resend_left_down() {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN};
    unsafe {
        let mut input: INPUT = zeroed();
        input.r#type = INPUT_MOUSE;
        input.Anonymous.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        SendInput(1, &input, size_of::<INPUT>() as i32);
    }
}

/// Whether the key went down since the previous call (works without keyboard focus).
pub fn key_pressed(vk: u16, was_down: &mut bool) -> bool {
    let s = unsafe { windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(vk as i32) };
    let down = (s as u16) & 0x8000 != 0;
    let pressed = (down && !*was_down) || (!down && s & 1 != 0);
    *was_down = down;
    pressed
}

/// Tool windows are skipped by capture apps (OBS) when they look for a window to capture.
/// Text on the clipboard (CF_UNICODETEXT), if any.
pub fn clipboard_text() -> Option<String> {
    use windows_sys::Win32::System::DataExchange::{CloseClipboard, GetClipboardData, OpenClipboard};
    use windows_sys::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};
    const CF_UNICODETEXT: u32 = 13;
    unsafe {
        if OpenClipboard(null_mut()) == 0 {
            return None;
        }
        let h = GetClipboardData(CF_UNICODETEXT);
        let mut out = None;
        if !h.is_null() {
            let p = GlobalLock(h as _) as *const u16;
            if !p.is_null() {
                // The block may have no NUL terminator: never scan past its real size.
                let max_u16 = (GlobalSize(h as _) / 2).min(8192);
                let mut n = 0;
                while n < max_u16 && *p.add(n) != 0 {
                    n += 1;
                }
                out = Some(String::from_utf16_lossy(std::slice::from_raw_parts(p, n)));
                GlobalUnlock(h as _);
            }
        }
        CloseClipboard();
        out
    }
}

pub fn set_tool_window(h: HWND) {
    unsafe {
        let ex = GetWindowLongW(h, GWL_EXSTYLE) as u32;
        SetWindowLongW(h, GWL_EXSTYLE, ((ex | WS_EX_TOOLWINDOW) & !WS_EX_APPWINDOW) as i32);
    }
}

/// Re-assert HWND_TOPMOST so apps like Discord cannot bury the overlay.
pub fn keep_topmost(h: HWND) {
    unsafe {
        SetWindowPos(
            h,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

/// Makes Win32 calls on the current thread report physical pixels.
pub fn make_thread_dpi_aware() {
    unsafe {
        SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }
}

/// The window in front belongs to another app and covers the whole screen of its monitor:
/// a game in fullscreen. The mouse is its, so we must not move it or steal the focus.
pub fn foreground_fullscreen() -> bool {
    unsafe {
        let fg = GetForegroundWindow();
        if fg.is_null() {
            return false;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(fg, &mut pid);
        if pid == std::process::id() {
            return false;
        }
        let Some(rect) = frame_rect(fg) else { return false };
        monitors().iter().any(|m| {
            rect.left <= m.bounds.left
                && rect.top <= m.bounds.top
                && rect.right >= m.bounds.right
                && rect.bottom >= m.bounds.bottom
        })
    }
}

/// All monitors, primary first. Rects are physical pixels.
pub fn monitors() -> Vec<MonitorInfo> {
    let mut list: Vec<MonitorInfo> = Vec::new();
    unsafe {
        EnumDisplayMonitors(null_mut(), null(), Some(collect_monitor), &mut list as *mut _ as LPARAM);
    }
    list.sort_by_key(|m| (!m.primary, m.bounds.left, m.bounds.top));
    list
}
