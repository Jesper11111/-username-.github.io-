# Quick self-check after editing (any AI can run this; see AGENTS.md section 4)
# Run from the game folder: powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1
# Checks: JS syntax (node --check), every <script> ?v= equals GAME_VERSION, every data/*.js is loaded,
# no leftover merge-conflict markers. Exit code 0 = OK.
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$utf8 = New-Object System.Text.UTF8Encoding $false
$node = 'C:\Program Files\nodejs\node.exe'
$bad = 0
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:bad++ }

# 1. JS syntax
$jsFiles = @(Get-ChildItem (Join-Path $root 'data') -Filter *.js) + @(Get-Item (Join-Path $root 'sw.js'))
if (Test-Path $node) {
  foreach ($f in $jsFiles) {
    $out = & $node --check $f.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "syntax error in $($f.Name):"; $out | Select-Object -First 6 | ForEach-Object { Write-Host "       $_" } }
  }
  Write-Host "[ok] syntax checked: $($jsFiles.Count) files"
} else { Write-Host "[skip] node not found, syntax not checked" -ForegroundColor Yellow }

# 2. Version numbers
$cfg = [IO.File]::ReadAllText((Join-Path $root 'data\config.js'), $utf8)
$m = [regex]::Match($cfg, "GAME_VERSION\s*=\s*'([^']+)'")
if (-not $m.Success) { Fail 'GAME_VERSION not found in data/config.js' } else {
  $ver = $m.Groups[1].Value
  $html = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)
  $scripts = [regex]::Matches($html, '<script src="(data/[^"?]+\.js)\?v=([^"]*)"')
  $wrong = @($scripts | Where-Object { $_.Groups[2].Value -ne $ver })
  foreach ($s in $wrong) { Fail "index.html loads $($s.Groups[1].Value)?v=$($s.Groups[2].Value) but GAME_VERSION is $ver" }
  if ($wrong.Count -eq 0) { Write-Host "[ok] version $ver used by all $($scripts.Count) scripts" }

  # 3. Every data/*.js is loaded by index.html
  $loaded = @($scripts | ForEach-Object { $_.Groups[1].Value })
  foreach ($f in (Get-ChildItem (Join-Path $root 'data') -Filter *.js)) {
    if ($loaded -notcontains "data/$($f.Name)") { Fail "data/$($f.Name) is not loaded by index.html" }
  }
}

# 4. Merge-conflict markers
$texts = Get-ChildItem $root -Recurse -File -Include *.js, *.html, *.css, *.json, *.md |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|\.claude)\\' }
foreach ($f in $texts) {
  $hit = Select-String -Path $f.FullName -Pattern '^(<<<<<<<|>>>>>>>) ' -List
  if ($hit) { Fail "merge-conflict marker in $($f.FullName.Substring($root.Length + 1)) line $($hit.LineNumber)" }
}

if ($bad -eq 0) { Write-Host 'ALL CHECKS PASSED' -ForegroundColor Green; exit 0 }
Write-Host "$bad problem(s) found" -ForegroundColor Red; exit 1
