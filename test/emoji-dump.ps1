# Dump of test/emoji-build.html into test/shots/emoji.html (for emoji-font.mjs)
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
New-Item -ItemType Directory (Join-Path $PSScriptRoot 'shots') -Force | Out-Null
$dom = Join-Path $PSScriptRoot 'shots\emoji.html'
$url = 'http://localhost:8762/test/emoji-build.html'
$common = @('--headless=new', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--virtual-time-budget=60000', '--window-size=1400,900', "--user-data-dir=$env:TEMP\mp-edge-emoji")
Start-Process $edge -ArgumentList ($common + @('--dump-dom', $url)) -Wait -WindowStyle Hidden -RedirectStandardOutput $dom
$html = Get-Content $dom -Raw
$rep = [regex]::Match($html, '<pre id="__report"[^>]*>(.*?)</pre>', 'Singleline').Groups[1].Value
"report: $([Math]::Round((Get-Item $dom).Length/1KB)) KB, has report: $([bool]$rep)"
