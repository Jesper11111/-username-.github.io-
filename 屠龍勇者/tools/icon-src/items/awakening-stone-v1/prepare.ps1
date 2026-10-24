$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$target = Join-Path $projectRoot 'images/icons/items/curAwaken-v1.png'
$source = [Drawing.Bitmap]::FromFile((Join-Path $PSScriptRoot 'source.png'))
$output = New-Object Drawing.Bitmap 128, 128, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($output)
try {
    $graphics.Clear([Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, (New-Object Drawing.Rectangle 8,8,112,112), 0,0,$source.Width,$source.Height, [Drawing.GraphicsUnit]::Pixel)
    $output.Save($target, [Drawing.Imaging.ImageFormat]::Png)
    $transparent = 0; $visible = 0
    for ($y = 0; $y -lt 128; $y++) { for ($x = 0; $x -lt 128; $x++) {
        if ($output.GetPixel($x,$y).A -eq 0) { $transparent++ } else { $visible++ }
        if (($x -lt 8 -or $x -ge 120 -or $y -lt 8 -or $y -ge 120) -and $output.GetPixel($x,$y).A -ne 0) { throw 'Transparent margin check failed' }
    } }
    if (!$visible -or !$transparent) { throw 'RGBA content check failed' }
    Write-Output "PASS: 128x128 RGBA; transparent pixels=$transparent; visible pixels=$visible; 8px safe margin."
} finally { $graphics.Dispose(); $output.Dispose(); $source.Dispose() }
