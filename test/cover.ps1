# Renders a test page headless and saves the image it exports in <pre id="__png">:
#   .\test\cover.ps1 "v=2" D:\out\cover2.png            (test/cover.html)
#   .\test\cover.ps1 "v=dance" D:\out\dance.gif gif     (test/gif.html)
param([string]$Query, [string]$Out, [string]$Page = 'cover')
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$dom = Join-Path $env:TEMP ("cover-" + [guid]::NewGuid() + ".html")
Start-Process $edge -ArgumentList @('--headless=new', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--virtual-time-budget=120000',
  '--window-size=800,600', "--user-data-dir=$env:TEMP\mp-edge-cover-$([guid]::NewGuid())", '--dump-dom', "http://localhost:8762/test/$Page.html?$Query") -Wait -WindowStyle Hidden -RedirectStandardOutput $dom
$m = [regex]::Match((Get-Content $dom -Raw), 'data:image/(?:png|gif);base64,([A-Za-z0-9+/=]+)')
Remove-Item $dom
if (-not $m.Success) { "FAILED: $Query"; return }
[IO.File]::WriteAllBytes($Out, [Convert]::FromBase64String($m.Groups[1].Value))
"ok: $Out ($([math]::Round((Get-Item $Out).Length / 1KB)) KB)"
