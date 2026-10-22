param($src, $out)
Add-Type -AssemblyName System.Drawing
$fr = [Drawing.Bitmap]::FromFile($src)
$minX=$fr.Width;$minY=$fr.Height;$maxX=0;$maxY=0
for($y=0;$y -lt $fr.Height;$y+=1){for($x=0;$x -lt $fr.Width;$x+=1){if($fr.GetPixel($x,$y).A -gt 30){if($x -lt $minX){$minX=$x};if($x -gt $maxX){$maxX=$x};if($y -lt $minY){$minY=$y};if($y -gt $maxY){$maxY=$y}}}}
$bmp = New-Object Drawing.Bitmap 128,128
$g = [Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'; $g.InterpolationMode='HighQualityBicubic'
$paper = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Point]::new(0,14),[Drawing.Point]::new(0,114),[Drawing.Color]::FromArgb(255,236,214,160),[Drawing.Color]::FromArgb(255,196,160,98))
$g.FillRectangle($paper, 22, 18, 84, 92)
$edge = New-Object Drawing.Pen([Drawing.Color]::FromArgb(255,110,74,36), 2)
$g.DrawRectangle($edge, 22, 18, 84, 92)
foreach($ry in 10,104){
  $roll = [Drawing.Drawing2D.LinearGradientBrush]::new(([Drawing.Point]::new(0,$ry)),([Drawing.Point]::new(0,($ry+14))),[Drawing.Color]::FromArgb(255,150,100,48),[Drawing.Color]::FromArgb(255,92,58,24))
  $g.FillEllipse($roll, 14, $ry, 100, 14); $g.DrawEllipse($edge, 14, $ry, 100, 14)
  $g.FillEllipse((New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255,70,42,18))), 8, ($ry+2), 10, 10)
  $g.FillEllipse((New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255,70,42,18))), 110, ($ry+2), 10, 10)
}
$glow = New-Object Drawing.Drawing2D.GraphicsPath; $glow.AddEllipse(30,34,68,68)
$pg = New-Object Drawing.Drawing2D.PathGradientBrush($glow); $pg.CenterColor=[Drawing.Color]::FromArgb(200,120,200,255); $pg.SurroundColors=@([Drawing.Color]::FromArgb(0,120,200,255))
$g.FillPath($pg,$glow)
$g.DrawEllipse((New-Object Drawing.Pen([Drawing.Color]::FromArgb(180,60,120,200),1.5)), 34, 40, 60, 60)
$w=$maxX-$minX+1;$h=$maxY-$minY+1;$k=[Math]::Min(86/$h, 80/$w)
$dw=[int]($w*$k);$dh=[int]($h*$k)
$g.DrawImage($fr,(New-Object Drawing.Rectangle ([int](64-$dw/2)),([int](104-$dh)),$dw,$dh),$minX,$minY,$w,$h,[Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $bmp.Save($out,[Drawing.Imaging.ImageFormat]::Png); "ok $w x $h"
