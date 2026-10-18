# Cut "please repaint" images for big-map seams (ARCHITECTURE.md section 58).
# Reads patches.json, crops each 1024x1024 square from the UNPATCHED map (base.jpg, written by build-map.ps1;
# falls back to images/maps/wild.jpg), paints the seam band magenta and writes:
#   todo/<id>.png       -> give this to the image AI (magenta = repaint here)
#   todo/<id>-orig.png  -> same crop without magenta (reference / for AIs that prefer "fix the seam" prompts)
# Run from the game folder: powershell -ExecutionPolicy Bypass -File tools\bigmap\seams\seam-cut.ps1 [-Only 01-beach-pyramid]
param([string]$Only = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $dir))
$utf8 = New-Object System.Text.UTF8Encoding $false
$cfg = [IO.File]::ReadAllText((Join-Path $dir 'patches.json'), $utf8) | ConvertFrom-Json
$base = Join-Path $dir 'base.jpg'
if (-not (Test-Path $base)) { $base = Join-Path $root 'images\maps\wild.jpg' }
$map = [System.Drawing.Bitmap]::FromFile($base)
$todo = Join-Path $dir 'todo'; New-Item -ItemType Directory -Force $todo | Out-Null
$S = [int]$cfg.size
$magenta = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 255))
foreach ($p in $cfg.patches) {
    if ($Only -and $p.id -ne $Only) { continue }
    $crop = $map.Clone((New-Object System.Drawing.Rectangle ([int]$p.x), ([int]$p.y), $S, $S), [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $crop.Save((Join-Path $todo "$($p.id)-orig.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $b = [int]$p.band
    if ($p.orient -eq 'v') { $g.FillRectangle($magenta, ([int]$p.at - [int]$p.x - $b), 0, 2 * $b, $S) }
    else { $g.FillRectangle($magenta, 0, ([int]$p.at - [int]$p.y - $b), $S, 2 * $b) }
    $g.Dispose()
    $crop.Save((Join-Path $todo "$($p.id).png"), [System.Drawing.Imaging.ImageFormat]::Png); $crop.Dispose()
    Write-Host "todo/$($p.id).png  ($($p.note))"
}
$map.Dispose()
