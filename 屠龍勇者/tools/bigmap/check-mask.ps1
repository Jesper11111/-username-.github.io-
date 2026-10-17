# Draw a walkability mask over images/maps/wild.jpg for checking (red = blocked, blue = water, grid every 10 tiles, numbers = tile index).
# -Mask: a text file with one row per line ('.' walk, '#' block, '~' water). -Out: output jpg (scaled to -OutW px wide).
param([string]$Mask, [string]$Out, [int]$OutW = 1600, [int]$X0 = 0, [int]$Y0 = 0, [int]$X1 = 100, [int]$Y1 = 88)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent $dir)
Add-Type -AssemblyName System.Drawing
$T = 32
$img = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'images\maps\wild.jpg'))
$rows = (Get-Content $Mask) | Where-Object { $_ -match '^[.#~]+$' }
$crop = New-Object System.Drawing.Rectangle ($X0 * $T), ($Y0 * $T), (($X1 - $X0) * $T), (($Y1 - $Y0) * $T)
$k = $OutW / $crop.Width
$o = New-Object System.Drawing.Bitmap $OutW, ([int]($crop.Height * $k))
$g = [System.Drawing.Graphics]::FromImage($o); $g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $o.Width, $o.Height), $crop, [System.Drawing.GraphicsUnit]::Pixel)
$red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(85, 255, 0, 0))
$blu = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(85, 0, 90, 255))
for ($y = $Y0; $y -lt $Y1 -and $y -lt $rows.Count; $y++) { $r = $rows[$y]
    for ($x = $X0; $x -lt $X1 -and $x -lt $r.Length; $x++) { $c = $r[$x]
        $rx = ($x - $X0) * $T * $k; $ry = ($y - $Y0) * $T * $k
        if ($c -eq '#') { $g.FillRectangle($red, [float]$rx, [float]$ry, [float]($T * $k), [float]($T * $k)) }
        elseif ($c -eq '~') { $g.FillRectangle($blu, [float]$rx, [float]$ry, [float]($T * $k), [float]($T * $k)) } } }
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 255, 255, 255))
$font = New-Object System.Drawing.Font 'Arial', 9; $wb = [System.Drawing.Brushes]::White
for ($x = [Math]::Ceiling($X0 / 5) * 5; $x -le $X1; $x += 5) { $px = ($x - $X0) * $T * $k; $g.DrawLine($pen, [float]$px, 0, [float]$px, $o.Height); $g.DrawString("$x", $font, $wb, [float]$px + 1, 1) }
for ($y = [Math]::Ceiling($Y0 / 5) * 5; $y -le $Y1; $y += 5) { $py = ($y - $Y0) * $T * $k; $g.DrawLine($pen, 0, [float]$py, $o.Width, [float]$py); $g.DrawString("$y", $font, $wb, 1, [float]$py + 1) }
$g.Dispose(); $img.Dispose()
$o.Save($Out, [System.Drawing.Imaging.ImageFormat]::Jpeg); $o.Dispose(); $Out
