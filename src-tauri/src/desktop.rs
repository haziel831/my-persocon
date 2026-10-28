// Desktop icons: reads the shell's SysListView32 (in explorer.exe) to find shortcuts to games.

use std::ffi::c_void;
use std::mem::{size_of, zeroed};
use std::path::PathBuf;
use std::ptr::{null, null_mut};
use std::sync::Mutex;

use base64::Engine;
use serde::Serialize;
use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HANDLE, HWND, LPARAM, POINT, RECT, TRUE};
use windows_sys::Win32::Graphics::Gdi::{
    ClientToScreen, DeleteObject, GetDC, GetDIBits, ReleaseDC, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS,
};
use windows_sys::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
use windows_sys::Win32::System::Diagnostics::Debug::{ReadProcessMemory, WriteProcessMemory};
use windows_sys::Win32::System::Memory::{VirtualAllocEx, VirtualFreeEx, MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE};
use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_VM_OPERATION, PROCESS_VM_READ, PROCESS_VM_WRITE};
use windows_sys::Win32::UI::Shell::{SHGetFileInfoW, SHGetFolderPathW, ShellExecuteW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
use windows_sys::Win32::UI::WindowsAndMessaging::*;

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

static SCANNED: Mutex<Vec<String>> = Mutex::new(Vec::new());

const LVM_GETITEMCOUNT: u32 = 0x1004;
const LVM_GETITEMRECT: u32 = 0x100E;
const LVM_GETITEMPOSITION: u32 = 0x1010;
const LVM_SETITEMPOSITION32: u32 = 0x1031;
const LVM_GETITEMTEXTW: u32 = 0x1073;
const RECYCLE_BIN: &str = "::{645FF040-5081-101B-9F08-00AA002F954E}";
const BIN_NAMES: &[&str] = &["lixeira", "recycle bin", "papelera de reciclaje", "corbeille", "papierkorb", "cestino"];
const LVIR_ICON: i32 = 1;
const CSIDL_DESKTOPDIRECTORY: i32 = 0x10;
const CSIDL_COMMON_DESKTOPDIRECTORY: i32 = 0x19;

#[repr(C)]
struct LvItem {
    mask: u32,
    item: i32,
    sub_item: i32,
    state: u32,
    state_mask: u32,
    text: usize,
    text_max: i32,
    image: i32,
    lparam: isize,
    indent: i32,
    group_id: i32,
    columns: u32,
    pu_columns: usize,
    pi_col_fmt: usize,
    group: i32,
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}

unsafe extern "system" fn find_defview(h: HWND, data: LPARAM) -> BOOL {
    let view = FindWindowExW(h, null_mut(), wide("SHELLDLL_DefView").as_ptr(), null());
    if !view.is_null() {
        *(data as *mut HWND) = view;
        return 0;
    }
    TRUE
}

unsafe fn desktop_listview() -> HWND {
    let progman = FindWindowW(wide("Progman").as_ptr(), null());
    let mut view = FindWindowExW(progman, null_mut(), wide("SHELLDLL_DefView").as_ptr(), null());
    if view.is_null() {
        EnumWindows(Some(find_defview), &mut view as *mut HWND as LPARAM);
    }
    if view.is_null() {
        return null_mut();
    }
    FindWindowExW(view, null_mut(), wide("SysListView32").as_ptr(), null())
}

unsafe fn send(lv: HWND, msg: u32, w: usize, l: isize) -> Option<usize> {
    let mut out = 0usize;
    (SendMessageTimeoutW(lv, msg, w, l, SMTO_ABORTIFHUNG, 300, &mut out) != 0).then_some(out)
}

fn folder(csidl: i32) -> Option<PathBuf> {
    let mut buf = [0u16; 260];
    let hr = unsafe { SHGetFolderPathW(null_mut(), csidl, null_mut(), 0, buf.as_mut_ptr()) };
    let n = buf.iter().position(|&c| c == 0).unwrap_or(0);
    (hr >= 0 && n > 0).then(|| PathBuf::from(String::from_utf16_lossy(&buf[..n])))
}

const GAME_HINTS: &[&str] = &[
    "steamapps", "steam://rungameid", "com.epicgames.launcher://apps", "epic games\\", "riot games",
    "riotclientservices", "gog galaxy\\games", "gog games", "battle.net\\", "battlenet://", "uplay://launch",
    "ubisoft game launcher\\games", "origin://launchgame", "ea games\\", "\\games\\", "\\jogos\\", "xboxgames",
    "minecraft", "roblox", "itch\\apps", "rockstar games", "hoyoplay", "genshin",
];
const LAUNCHERS: &[&str] = &[
    "steam", "epic games launcher", "battle.net", "ubisoft connect", "ea", "ea app", "gog galaxy", "riot client",
    "xbox", "origin", "rockstar games launcher",
];

fn is_game(path: &PathBuf, name: &str) -> bool {
    if LAUNCHERS.contains(&name.to_lowercase().as_str()) {
        return false;
    }
    let Ok(bytes) = std::fs::read(path) else { return false };
    let text: String = bytes.iter().take(65536).filter(|&&b| b != 0).map(|&b| (b as char).to_ascii_lowercase()).collect();
    GAME_HINTS.iter().any(|h| text.contains(h))
}

fn crc32(data: &[u8]) -> u32 {
    let mut c = !0u32;
    for &b in data {
        c ^= b as u32;
        for _ in 0..8 {
            c = if c & 1 != 0 { 0xEDB8_8320 ^ (c >> 1) } else { c >> 1 };
        }
    }
    !c
}

fn png(w: u32, h: u32, rgba: &[u8]) -> Vec<u8> {
    let mut raw = Vec::with_capacity((w * 4 + 1) as usize * h as usize);
    for row in rgba.chunks((w * 4) as usize) {
        raw.push(0);
        raw.extend_from_slice(row);
    }
    let mut z = vec![0x78, 0x01];
    let chunks: Vec<&[u8]> = raw.chunks(65535).collect();
    for (i, c) in chunks.iter().enumerate() {
        let len = c.len() as u16;
        z.push((i + 1 == chunks.len()) as u8);
        z.extend_from_slice(&len.to_le_bytes());
        z.extend_from_slice(&(!len).to_le_bytes());
        z.extend_from_slice(c);
    }
    let (mut a, mut b) = (1u32, 0u32);
    for &v in &raw {
        a = (a + v as u32) % 65521;
        b = (b + a) % 65521;
    }
    z.extend_from_slice(&((b << 16) | a).to_be_bytes());
    let mut out = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(&w.to_be_bytes());
    ihdr.extend_from_slice(&h.to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
    for (kind, data) in [(b"IHDR", ihdr), (b"IDAT", z), (b"IEND", Vec::new())] {
        out.extend_from_slice(&(data.len() as u32).to_be_bytes());
        let mut body = kind.to_vec();
        body.extend_from_slice(&data);
        out.extend_from_slice(&body);
        out.extend_from_slice(&crc32(&body).to_be_bytes());
    }
    out
}

unsafe fn bitmap_bgra(hdc: windows_sys::Win32::Graphics::Gdi::HDC, bm: *mut c_void, size: i32) -> Option<Vec<u8>> {
    let mut bi: BITMAPINFO = zeroed();
    bi.bmiHeader.biSize = size_of::<BITMAPINFOHEADER>() as u32;
    bi.bmiHeader.biWidth = size;
    bi.bmiHeader.biHeight = -size;
    bi.bmiHeader.biPlanes = 1;
    bi.bmiHeader.biBitCount = 32;
    let mut px = vec![0u8; (size * size * 4) as usize];
    (GetDIBits(hdc, bm, 0, size as u32, px.as_mut_ptr() as *mut c_void, &mut bi, DIB_RGB_COLORS) != 0).then_some(px)
}

fn icon_png(path: &str) -> Option<String> {
    unsafe {
        let mut sfi: SHFILEINFOW = zeroed();
        let ok = SHGetFileInfoW(wide(path).as_ptr(), 0, &mut sfi, size_of::<SHFILEINFOW>() as u32, SHGFI_ICON | SHGFI_LARGEICON);
        if ok == 0 || sfi.hIcon.is_null() {
            return None;
        }
        let mut info: ICONINFO = zeroed();
        let got = GetIconInfo(sfi.hIcon, &mut info) != 0;
        DestroyIcon(sfi.hIcon);
        if !got {
            return None;
        }
        let size = GetSystemMetrics(SM_CXICON).max(16);
        let hdc = GetDC(null_mut());
        let color = if info.hbmColor.is_null() { None } else { bitmap_bgra(hdc, info.hbmColor, size) };
        let mask = bitmap_bgra(hdc, info.hbmMask, size);
        ReleaseDC(null_mut(), hdc);
        DeleteObject(info.hbmColor);
        DeleteObject(info.hbmMask);
        let mut px = color?;
        let has_alpha = px.chunks(4).any(|p| p[3] != 0);
        for (i, p) in px.chunks_mut(4).enumerate() {
            p.swap(0, 2);
            if !has_alpha {
                p[3] = if mask.as_ref().map_or(false, |m| m[i * 4] != 0) { 0 } else { 255 };
            }
        }
        let bytes = png(size as u32, size as u32, &px);
        Some(format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
    }
}

// The desktop's list view inside explorer.exe, with a scratch buffer in its memory for the messages.
struct Remote {
    lv: HWND,
    proc: HANDLE,
    mem: *mut c_void,
}

impl Remote {
    unsafe fn open() -> Option<Remote> {
        let lv = desktop_listview();
        if lv.is_null() || IsWindowVisible(lv) == 0 {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(lv, &mut pid);
        let proc = OpenProcess(PROCESS_VM_OPERATION | PROCESS_VM_READ | PROCESS_VM_WRITE, 0, pid);
        if proc.is_null() {
            return None;
        }
        let mem = VirtualAllocEx(proc, null(), 4096, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
        if mem.is_null() {
            CloseHandle(proc);
            return None;
        }
        Some(Remote { lv, proc, mem })
    }

    unsafe fn count(&self) -> usize {
        send(self.lv, LVM_GETITEMCOUNT, 0, 0).unwrap_or(0).min(500)
    }

    unsafe fn write<T>(&self, v: &T) {
        WriteProcessMemory(self.proc, self.mem, v as *const T as *const c_void, size_of::<T>(), null_mut());
    }

    unsafe fn read<T>(&self, v: &mut T) {
        ReadProcessMemory(self.proc, self.mem, v as *mut T as *mut c_void, size_of::<T>(), null_mut());
    }

    unsafe fn name(&self, i: usize) -> String {
        let text_at = self.mem as usize + 512;
        let mut item: LvItem = zeroed();
        item.text = text_at;
        item.text_max = 260;
        self.write(&item);
        let n = send(self.lv, LVM_GETITEMTEXTW, i, self.mem as isize).unwrap_or(0).min(259);
        let mut buf = [0u16; 260];
        ReadProcessMemory(self.proc, text_at as *const c_void, buf.as_mut_ptr() as *mut c_void, 520, null_mut());
        String::from_utf16_lossy(&buf[..n])
    }

    unsafe fn rect(&self, i: usize) -> Option<RECT> {
        let mut r = RECT { left: LVIR_ICON, top: 0, right: 0, bottom: 0 };
        self.write(&r);
        if send(self.lv, LVM_GETITEMRECT, i, self.mem as isize).unwrap_or(0) == 0 {
            return None;
        }
        self.read(&mut r);
        Some(r)
    }

    unsafe fn pos(&self, i: usize) -> Option<POINT> {
        let mut p = POINT { x: 0, y: 0 };
        self.write(&p);
        if send(self.lv, LVM_GETITEMPOSITION, i, self.mem as isize).unwrap_or(0) == 0 {
            return None;
        }
        self.read(&mut p);
        Some(p)
    }

    unsafe fn set_pos(&self, i: usize, p: POINT) {
        self.write(&p);
        send(self.lv, LVM_SETITEMPOSITION32, i, self.mem as isize);
    }

    unsafe fn find(&self, name: &str) -> Option<usize> {
        (0..self.count()).find(|&i| self.name(i) == name)
    }
}

impl Drop for Remote {
    fn drop(&mut self) {
        unsafe {
            VirtualFreeEx(self.proc, self.mem, 0, MEM_RELEASE);
            CloseHandle(self.proc);
        }
    }
}

/// Icons on the desktop, in physical pixels relative to `work` (left, top). Empty when hidden.
/// Only shortcuts (games flagged), as the game finder uses them.
pub fn scan(work: (i32, i32, i32, i32)) -> Vec<DesktopIcon> {
    let out = scan_icons(work, false);
    *SCANNED.lock().unwrap() = out.iter().map(|d| d.path.clone()).collect();
    out
}

/// Every icon (with its picture when it can be found), the Recycle Bin flagged; no paths exposed
/// except for shortcuts.
pub fn scan_all(work: (i32, i32, i32, i32)) -> Vec<DesktopIcon> {
    scan_icons(work, true)
}

fn scan_icons(work: (i32, i32, i32, i32), all: bool) -> Vec<DesktopIcon> {
    // Internet shortcuts (.url) need COM for their icons.
    unsafe { CoInitializeEx(null(), COINIT_APARTMENTTHREADED as u32) };
    // (stem, full name, path, is shortcut)
    let mut files: Vec<(String, String, PathBuf, bool)> = Vec::new();
    for dir in [folder(CSIDL_DESKTOPDIRECTORY), folder(CSIDL_COMMON_DESKTOPDIRECTORY)].into_iter().flatten() {
        let Ok(rd) = std::fs::read_dir(&dir) else { continue };
        for e in rd.flatten() {
            let p = e.path();
            let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
            let link = ext == "lnk" || ext == "url";
            if !link && !all {
                continue;
            }
            let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
            let full = p.file_name().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
            files.push((stem, full, p.clone(), link));
        }
    }

    let mut out = Vec::new();
    unsafe {
        let Some(r) = Remote::open() else { return out };
        for i in 0..r.count() {
            let Some(rc) = r.rect(i) else { continue };
            let name = r.name(i);
            let mut tl = POINT { x: rc.left, y: rc.top };
            let mut br = POINT { x: rc.right, y: rc.bottom };
            ClientToScreen(r.lv, &mut tl);
            ClientToScreen(r.lv, &mut br);
            let (wl, wt, wr, wb) = work;
            if br.x <= wl || tl.x >= wr || br.y <= wt || tl.y >= wb || name.is_empty() {
                continue;
            }
            let key = name.to_lowercase();
            let file = files.iter().find(|(s, f, _, link)| *s == key && (*link || all) || (all && *f == key));
            let bin = all && file.is_none() && BIN_NAMES.contains(&key.as_str());
            let (path, game, icon) = match file {
                Some((_, _, path, link)) => {
                    let path_s = path.to_string_lossy().to_string();
                    let game = *link && is_game(path, &name);
                    let icon = if game || all { icon_png(&path_s) } else { None };
                    (if *link { path_s } else { String::new() }, game, icon)
                }
                None if all => (String::new(), false, if bin { icon_png(RECYCLE_BIN) } else { None }),
                None => continue,
            };
            out.push(DesktopIcon {
                icon,
                name,
                path,
                game,
                x: (tl.x - wl) as f64,
                y: (tl.y - wt) as f64,
                w: (br.x - tl.x) as f64,
                h: (br.y - tl.y) as f64,
                bin,
            });
        }
    }
    out
}

/// Moves the named icon by (dx, dy); returns its previous position (list view coordinates), or
/// None when it can't be moved (not found, auto-arrange put it back).
pub fn move_icon(name: &str, dx: i32, dy: i32) -> Option<(i32, i32)> {
    unsafe {
        let r = Remote::open()?;
        let i = r.find(name)?;
        let p = r.pos(i)?;
        r.set_pos(i, POINT { x: p.x + dx, y: p.y + dy });
        let q = r.pos(i)?;
        if q.x == p.x && q.y == p.y {
            return None;
        }
        Some((p.x, p.y))
    }
}

/// Puts the named icon at (x, y) (list view coordinates, as returned by `move_icon`).
pub fn place_icon(name: &str, x: i32, y: i32) -> bool {
    unsafe {
        let Some(r) = Remote::open() else { return false };
        let Some(i) = r.find(name) else { return false };
        r.set_pos(i, POINT { x, y });
        true
    }
}

/// Opens a shortcut found by the last scan (anything else is refused).
pub fn open(path: &str) -> Result<(), String> {
    if !SCANNED.lock().unwrap().iter().any(|p| p == path) {
        return Err("Atalho desconhecido".into());
    }
    let r = unsafe { ShellExecuteW(null_mut(), wide("open").as_ptr(), wide(path).as_ptr(), null(), null(), SW_SHOWNORMAL) };
    if (r as isize) > 32 { Ok(()) } else { Err("Não foi possível abrir o atalho".into()) }
}

