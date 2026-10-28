# Drives the real build for manual-only bugs: .\test\live.ps1 start | shot <name> | click <x> <y> | type <text> | key <vk> | stop
# Player data goes to test\live-data (never the real %APPDATA%). Coordinates are physical screen pixels.
param([string]$Cmd, [string]$A, [string]$B)
Add-Type -AssemblyName System.Drawing, System.Windows.Forms
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class U {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, IntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int l, t, r, b; }
  [StructLayout(LayoutKind.Sequential)] public struct GUI { public uint cb, flags; public IntPtr active, focus, capture, menuOwner, moveSize, caret; public RECT rc; }
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint tid, ref GUI g);
  public static string Name(IntPtr h) { var s = new System.Text.StringBuilder(256); GetClassName(h, s, 256); uint pid; GetWindowThreadProcessId(h, out pid); return h + " " + s + " pid" + pid; }
}
'@
[U]::SetProcessDPIAware() | Out-Null
$root = Split-Path $PSScriptRoot
$shots = Join-Path $PSScriptRoot 'shots'
switch ($Cmd) {
  'start' {
    $data = Join-Path $PSScriptRoot 'live-data'
    New-Item -ItemType Directory $data -Force | Out-Null
    $exe = Get-ChildItem (Join-Path $root 'dist') -Recurse -Filter 'My Persocon.exe' | Sort-Object LastWriteTime | Select-Object -Last 1
    $psi = New-Object System.Diagnostics.ProcessStartInfo $exe.FullName
    $psi.EnvironmentVariables['APPDATA'] = $data
    if ($A -eq 'cdp') { $psi.EnvironmentVariables['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = '--remote-debugging-port=9333' }
    $psi.UseShellExecute = $false
    [System.Diagnostics.Process]::Start($psi).Id
  }
  'shot' {
    $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap $s.Width, $s.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($s.Location, [System.Drawing.Point]::Empty, $s.Size)
    $half = New-Object System.Drawing.Bitmap ([int]($s.Width / 2)), ([int]($s.Height / 2))
    $g2 = [System.Drawing.Graphics]::FromImage($half)
    $g2.DrawImage($bmp, 0, 0, $half.Width, $half.Height)
    $half.Save((Join-Path $shots "$A.png"))
    $sb = New-Object System.Text.StringBuilder 256
    [U]::GetWindowText([U]::GetForegroundWindow(), $sb, 256) | Out-Null
    "screen $($s.Width)x$($s.Height) (saved at half size) · foreground: $sb"
  }
  'click' { [U]::SetCursorPos([int]$A, [int]$B) | Out-Null; Start-Sleep -Milliseconds 120; [U]::mouse_event(2, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 60; [U]::mouse_event(4, 0, 0, 0, [IntPtr]::Zero) }
  'type' { [System.Windows.Forms.SendKeys]::SendWait($A) }
  'key' { [U]::keybd_event([byte]$A, 0, 0, [IntPtr]::Zero); [U]::keybd_event([byte]$A, 0, 2, [IntPtr]::Zero) }
  'focus' {
    $fg = [U]::GetForegroundWindow(); $pid0 = 0
    $tid = [U]::GetWindowThreadProcessId($fg, [ref]$pid0)
    $g = New-Object U+GUI; $g.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($g)
    [U]::GetGUIThreadInfo($tid, [ref]$g) | Out-Null
    "foreground: $([U]::Name($fg)) exstyle=0x{0:X}" -f [U]::GetWindowLong($fg, -20)
    "active: $([U]::Name($g.active))"
    "focus: $([U]::Name($g.focus))"
  }
  'stop' { Get-Process | Where-Object { $_.Path -like '*My Persocon*' } | Stop-Process -Force }
}
