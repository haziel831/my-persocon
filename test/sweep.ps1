# Runs every harness scenario and lists the ones with page errors: .\test\sweep.ps1 [extraQuery] [budgetMs]
param([string]$Extra = 'model=my', [int]$Budget = 15000)
$steps = (Select-String -Path (Join-Path $PSScriptRoot 'ui.html') -Pattern "step === '([\w-]+)'" -AllMatches | % { $_.Matches } | % { $_.Groups[1].Value } | Sort-Object -Unique) | ? { $_ -ne 'soak' }
foreach ($s in $steps) {
  $out = & (Join-Path $PSScriptRoot 'shot.ps1') "do=$s&$Extra" "sweep-$s" $Budget 2>$null
  $err = $out | ? { $_ -like 'ERRORS:*' }
  if ($err) { "[$s] $err" } else { "[$s] ok" }
}
'SWEEP DONE'
