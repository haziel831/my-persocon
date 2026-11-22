# Remote TTS helper for My Persocon (no external modules).
# Engines: edge = Microsoft Edge Neural TTS (free WebSocket), fish = Fish Audio API.
# Writes raw MP3 bytes to -Out and prints a JSON line to stdout.
param(
  [Parameter(Mandatory=$true)][string]$Engine,
  [Parameter(Mandatory=$true)][string]$TextFile,
  [Parameter(Mandatory=$true)][string]$Out,
  [string]$Voice = 'pt-BR-LeticiaNeural',
  [string]$Lang = 'pt-br',
  [double]$Speed = 1.0,
  [double]$PitchHz = 0,
  [string]$ApiKey = '',
  [string]$FishVoice = '',
  [string]$Model = 's2.1-pro'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
$mp3 = $null

function Escape-Xml([string]$s) {
  return $s.Replace('&','&amp;').Replace('<','&lt;').Replace('>','&gt;').Replace('"','&quot;').Replace("'",'&apos;')
}

if ($Engine -eq 'fish') {
  if ([string]::IsNullOrWhiteSpace($ApiKey)) { throw 'Fish Audio API key missing' }
  $bodyObj = @{ text = $text; model = $Model }
  if (-not [string]::IsNullOrWhiteSpace($FishVoice)) { $bodyObj.reference_id = $FishVoice }
  $body = $bodyObj | ConvertTo-Json -Compress -Depth 4
  $req = [System.Net.HttpWebRequest]::Create('https://api.fish.audio/v1/tts')
  $req.Method = 'POST'
  $req.ContentType = 'application/json'
  $req.Headers.Add('Authorization', 'Bearer ' + $ApiKey)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $req.ContentLength = $bytes.Length
  $stream = $req.GetRequestStream()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Close()
  $resp = $req.GetResponse()
  $ms = New-Object System.IO.MemoryStream
  $resp.GetResponseStream().CopyTo($ms)
  $resp.Close()
  $mp3 = $ms.ToArray()
} else {
  $token = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
  # Edge TTS DRM header (clock skew +5 minutes, SHA256 of ticks+token)
  $ticks = [long](([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + 300 - 11644473600) * 10000000)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$ticks$token"))
  $gec = ([System.BitConverter]::ToString($hashBytes)).Replace('-','').ToUpperInvariant()
  $connId = [guid]::NewGuid().ToString('N')
  $uri = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=$token&ConnectionId=$connId&Sec-MS-GEC=$gec&Sec-MS-GEC-Version=1-143.0.3650.75"
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.Options.SetRequestHeader('Origin','https://www.bing.com')
  $ws.Options.SetRequestHeader('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0')
  $ws.ConnectAsync([Uri]$uri, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $rate = [int][Math]::Round(($Speed - 1.0) * 100)
  $rateStr = if ($rate -ge 0) { "+$rate%" } else { "$rate%" }
  $pitch = [int][Math]::Round($PitchHz)
  $pitchStr = if ($pitch -ge 0) { "+$pitch Hz" } else { "$pitch Hz" }
  $xml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/Synthesis' xml:lang='$Lang'><voice name='$Voice'><prosody rate='$rateStr' pitch='$pitchStr'>" + (Escape-Xml $text) + "</prosody></voice></speak>"
  $cfg = 'X-Timestamp:' + [DateTimeOffset]::UtcNow.ToString('o') + "`r`nContent-Type:application/json; charset=utf-8`r`nPath:speech.config`r`n`r`n" + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}'
  $cfgBytes = [System.Text.Encoding]::UTF8.GetBytes($cfg)
  $ws.SendAsync([ArraySegment[byte]]$cfgBytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $reqId = [guid]::NewGuid().ToString('N').ToUpperInvariant()
  $ssml = "X-RequestId:$reqId`r`nContent-Type:application/ssml+xml`r`nPath:ssml`r`n`r`n$xml"
  $ssmlBytes = [System.Text.Encoding]::UTF8.GetBytes($ssml)
  $ws.SendAsync([ArraySegment[byte]]$ssmlBytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $buffer = New-Object byte[] 8192
  $ms = New-Object System.IO.MemoryStream
  $deadline = [DateTime]::UtcNow.AddSeconds(25)
  while ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open -and [DateTime]::UtcNow -lt $deadline) {
    $res = $ws.ReceiveAsync([ArraySegment[byte]]$buffer, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    if ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { break }
    if ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Binary) {
      $chunk = New-Object byte[] $res.Count
      [Array]::Copy($buffer, 0, $chunk, 0, $res.Count)
      $sep = -1
      for ($i = 0; $i -lt $chunk.Length - 3; $i++) {
        if ($chunk[$i] -eq 13 -and $chunk[$i+1] -eq 10 -and $chunk[$i+2] -eq 13 -and $chunk[$i+3] -eq 10) { $sep = $i + 4; break }
      }
      if ($sep -ge 0 -and $sep -lt $chunk.Length) { $ms.Write($chunk, $sep, $chunk.Length - $sep) }
    }
    if ($res.EndOfMessage -and $ms.Length -gt 0 -and -not $ws.Connected) { break }
  }
  try { $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult() } catch {}
  $ws.Dispose()
  $mp3 = $ms.ToArray()
}
if ($null -eq $mp3 -or $mp3.Length -eq 0) { throw 'No audio returned by TTS engine' }
[System.IO.File]::WriteAllBytes($Out, $mp3)
'{"ok":true}'
