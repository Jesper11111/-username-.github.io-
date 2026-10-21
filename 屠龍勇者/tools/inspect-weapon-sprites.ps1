param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
$specs = Get-Content (Join-Path $PSScriptRoot 'weapon-sprite-specs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$root = Split-Path $PSScriptRoot -Parent
foreach ($spec in $specs) {
    $canvas = New-Object System.Drawing.Bitmap 1440, 660
    $g = [System.Drawing.Graphics]::FromImage($canvas); $g.Clear([System.Drawing.Color]::FromArgb(42, 42, 42))
    $font = New-Object System.Drawing.Font 'Arial', 10
    $row = 0
    foreach ($action in @('walk', 'attack', 'cast', 'hit')) {
        $anim = $spec.sprite.$action; $img = [System.Drawing.Image]::FromFile((Join-Path $root $anim.src))
        for ($d = 0; $d -lt 3; $d++) {
            $dir = @('down', 'right', 'up')[$d]; $count = $anim.frames.$dir
            $baseX = $d * 480
            $g.DrawString("$($spec.id) $action $dir", $font, [System.Drawing.Brushes]::White, $baseX, ($row * 165))
            for ($f = 0; $f -lt $count; $f++) {
                $w = [Math]::Min(100, 470 / $count); $k = [Math]::Min($w / $anim.cellW, 132 / $anim.cellH)
                $dw = $anim.cellW * $k; $dh = $anim.cellH * $k
                $dst = New-Object System.Drawing.RectangleF ($baseX + $f * $w), ($row * 165 + 25), $dw, $dh
                $src = New-Object System.Drawing.RectangleF ($f * $anim.cellW), ($d * $anim.cellH), $anim.cellW, $anim.cellH
                $g.DrawImage($img, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
                $g.DrawString("$f", $font, [System.Drawing.Brushes]::Yellow, ($baseX + $f * $w), ($row * 165 + 145))
            }
        }
        $img.Dispose(); $row++
    }
    $g.Dispose(); $font.Dispose(); $canvas.Save((Join-Path $OutDir ($spec.id + '-weapons.png')), [System.Drawing.Imaging.ImageFormat]::Png); $canvas.Dispose()
}
