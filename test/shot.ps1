# Headless Edge screenshot (and DOM dump) of the browser harness: .\test\shot.ps1 "do=intro&stage=box" out [budgetMs] [WxH]
param([string]$Query, [string]$Out, [int]$Budget = 12000, [string]$Size = '1280,720')
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$dir = Join-Path $PSScriptRoot 'shots'
New-Item -ItemType Directory $dir -Force | Out-Null
$png = Join-Path $dir "$Out.png"
$url = "http://localhost:8762/test/ui.html?$Query"
$common = @('--headless=new', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
  "--virtual-time-budget=$Budget", "--window-size=$Size", "--user-data-dir=$env:TEMP\mp-edge-$Out")
Start-Process $edge -ArgumentList ($common + @("--screenshot=`"$png`"", $url)) -Wait -WindowStyle Hidden
$dom = Join-Path $dir "$Out.html"
Start-Process $edge -ArgumentList ($common + @('--dump-dom', $url)) -Wait -WindowStyle Hidden -RedirectStandardOutput $dom
$html = Get-Content $dom -Raw -ErrorAction SilentlyContinue
$rep = [regex]::Match($html, '<pre id="__report"[^>]*>(.*?)</pre>').Groups[1].Value
$err = [regex]::Match($html, '<pre id="__err"[^>]*>(.*?)</pre>', 'Singleline').Groups[1].Value
"report: $rep"
if ($err) { "ERRORS: $err" }
