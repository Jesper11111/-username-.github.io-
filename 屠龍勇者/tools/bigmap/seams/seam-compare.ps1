# Before/after strip for each seam patch (section 58): left = base.jpg (unpatched), right = images/maps/wild.jpg (patched).
# Output: seams/todo/<id>-compare.jpg (1400x700). Run from the game folder after build-map.ps1.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $dir))
$cfg = [IO.File]::ReadAllText((Join-Path $dir 'patches.json'), (New-Object System.Text.UTF8Encoding $false)) | ConvertFrom-Json
$before = [System.Drawing.Bitmap]::FromFile((Join-Path $dir 'base.jpg'))
$after = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'images\maps\wild.jpg'))
$S = [int]$cfg.size
foreach ($p in $cfg.patches) {
    $o = New-Object System.Drawing.Bitmap 1400, 720
    $g = [System.Drawing.Graphics]::FromImage($o); $g.Clear([System.Drawing.Color]::Black); $g.InterpolationMode = 'HighQualityBicubic'
    $src = New-Object System.Drawing.Rectangle ([int]$p.x), ([int]$p.y), $S, $S
    $g.DrawImage($before, (New-Object System.Drawing.Rectangle 0, 20, 690, 690), $src, 'Pixel')
    $g.DrawImage($after, (New-Object System.Drawing.Rectangle 710, 20, 690, 690), $src, 'Pixel')
    $font = New-Object System.Drawing.Font 'Arial', 11, ([System.Drawing.FontStyle]::Bold)
    $g.DrawString("BEFORE  $($p.id)", $font, [System.Drawing.Brushes]::White, 4, 2)
    $g.DrawString('AFTER', $font, [System.Drawing.Brushes]::White, 714, 2)
    $g.Dispose()
    $o.Save((Join-Path $dir "todo\$($p.id)-compare.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg); $o.Dispose()
    "todo/$($p.id)-compare.jpg"
}
$before.Dispose(); $after.Dispose()
