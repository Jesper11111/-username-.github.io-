param([Parameter(Mandatory=$true)][string]$OutputDir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot=Split-Path $PSScriptRoot -Parent
$items=@((Get-Content (Join-Path $PSScriptRoot 'item-art-batches.json') -Raw -Encoding UTF8 | ConvertFrom-Json).batches.items)
$items+=((Get-Content (Join-Path $PSScriptRoot 'item-art-inventory.json') -Raw -Encoding UTF8 | ConvertFrom-Json) | Where-Object id -eq 'elvenWafer')
$font=New-Object System.Drawing.Font('Microsoft JhengHei',10)
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
for($page=0;$page -lt [math]::Ceiling($items.Count/64);$page++){
 $bmp=New-Object System.Drawing.Bitmap(1024,1216)
 $g=[System.Drawing.Graphics]::FromImage($bmp);$g.Clear([System.Drawing.Color]::FromArgb(25,27,32))
 for($cell=0;$cell -lt 64;$cell++){
  if($page*64+$cell -ge $items.Count){break}
  $it=$items[$page*64+$cell];$x=($cell%8)*128;$y=[math]::Floor($cell/8)*152
  $im=[System.Drawing.Image]::FromFile((Join-Path $projectRoot ('images\icons\items\'+$it.id+'.png')))
  $g.DrawImage($im,$x,$y,128,128);$im.Dispose()
  $label=$it.name;if($label.Length -gt 9){$label=$label.Substring(0,9)}
  $g.DrawString($label,$font,[System.Drawing.Brushes]::Wheat,$x+2,$y+128)
 }
 $g.Dispose();$bmp.Save((Join-Path $OutputDir ('item-art-page-'+($page+1)+'.png')),[System.Drawing.Imaging.ImageFormat]::Png);$bmp.Dispose()
}
$font.Dispose()
