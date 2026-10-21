param([switch]$Partial)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Drawing.Drawing2D;
public static class SceneArtBake {
 static void Quality(Graphics g){g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;g.CompositingQuality=CompositingQuality.HighQuality;}
 public static void Jpg(Bitmap b,string dest,long quality){var enc=Array.Find(ImageCodecInfo.GetImageEncoders(),e=>e.MimeType=="image/jpeg");using(var p=new EncoderParameters(1)){p.Param[0]=new EncoderParameter(System.Drawing.Imaging.Encoder.Quality,quality);b.Save(dest,enc,p);}}
 public static void Resize(string src,string dest,int w,int h){using(var im=new Bitmap(src))using(var b=new Bitmap(w,h))using(var g=Graphics.FromImage(b)){Quality(g);g.Clear(Color.FromArgb(25,23,20));g.DrawImage(im,0,0,w,h);Jpg(b,dest,92);}}
 static Rectangle Bounds(Bitmap im,Rectangle cell){int x0=cell.Right,y0=cell.Bottom,x1=-1,y1=-1,n=0;for(int y=cell.Top;y<cell.Bottom;y++)for(int x=cell.Left;x<cell.Right;x++)if(im.GetPixel(x,y).A>12){n++;x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}if(n<80)throw new Exception("Empty transparent cell in "+cell);return Rectangle.FromLTRB(x0,y0,x1+1,y1+1);}
 public static void Sprite(string src,string dest,bool atlas){using(var im=new Bitmap(src)){int cols=atlas?4:1,rows=atlas?3:1,cw=atlas?192:160,ch=224;var boxes=new Rectangle[cols*rows];float maxW=0,maxH=0;for(int i=0;i<boxes.Length;i++){int x=i%cols,y=i/cols;var cell=Rectangle.FromLTRB(x*im.Width/cols,y*im.Height/rows,(x+1)*im.Width/cols,(y+1)*im.Height/rows);boxes[i]=Bounds(im,cell);maxW=Math.Max(maxW,boxes[i].Width);maxH=Math.Max(maxH,boxes[i].Height);}float scale=Math.Min((cw-24)/maxW,(atlas?168:198)/maxH);using(var b=new Bitmap(cw*cols,ch*rows,PixelFormat.Format32bppArgb))using(var g=Graphics.FromImage(b)){Quality(g);g.Clear(Color.Transparent);for(int i=0;i<boxes.Length;i++){var r=boxes[i];float w=r.Width*scale,h=r.Height*scale;g.DrawImage(im,new RectangleF(i%cols*cw+(cw-w)/2,i/cols*ch+ch-12-h,w,h),r,GraphicsUnit.Pixel);}b.Save(dest,ImageFormat.Png);}}}
 public static void World(string[] src,string dest,string mini){using(var b=new Bitmap(6016,4768))using(var g=Graphics.FromImage(b)){Quality(g);for(int i=0;i<16;i++){int x=i%4,y=i/4,y0=y*1184,y1=y==3?4768:(y+1)*1184;using(var im=new Bitmap(src[i]))g.DrawImage(im,x*1504,y0,1504,y1-y0);}Jpg(b,dest,91);using(var m=new Bitmap(752,596))using(var mg=Graphics.FromImage(m)){Quality(mg);mg.DrawImage(b,0,0,752,596);Jpg(m,mini,90);}}}
}
'@
$project=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$mapDir=Join-Path $project 'images\maps\rework'
$monDir=Join-Path $project 'images\monsters\rework'
$npcDir=Join-Path $project 'images\npc\rework'
foreach($dir in @($mapDir,$monDir,$npcDir)){New-Item -ItemType Directory -Force -Path $dir | Out-Null}
$plan=Get-Content (Join-Path $PSScriptRoot 'plan.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$count=0
foreach($a in $plan.assets){
 $src=Join-Path $PSScriptRoot ('src\'+$a.id+'.png')
 if(!(Test-Path -LiteralPath $src)){if($Partial){continue};throw "Missing original $($a.id)"}
 if($a.kind -eq 'monster'){[SceneArtBake]::Sprite($src,(Join-Path $monDir ($a.id+'.png')),$true)}
 elseif($a.kind -eq 'npc'){[SceneArtBake]::Sprite($src,(Join-Path $npcDir ($a.id+'.png')),$false)}
 elseif($a.kind -eq 'atlas'){[SceneArtBake]::Resize($src,(Join-Path $mapDir 'world-atlas.jpg'),1880,1490)}
 elseif($a.kind -ne 'terrain'){[SceneArtBake]::Resize($src,(Join-Path $mapDir ($a.id+'.jpg')),1600,960)}
 $count++
}
$tileIds=@('swamp','forest','snow','snow','pirate','meadow','desert','lava','coast','mine-upper','pyramid','titan','crypt','cavern','mine-deep','forest')
$tilePaths=@($tileIds | ForEach-Object {Join-Path $PSScriptRoot ('src\terrain-'+$_+'.png')})
if(@($tilePaths | Where-Object {!(Test-Path -LiteralPath $_)}).Count -eq 0){[SceneArtBake]::World($tilePaths,(Join-Path $mapDir 'world-play.jpg'),(Join-Path $mapDir 'world-mini.jpg'))}
elseif(!$Partial){throw 'Incomplete world terrain originals'}
Write-Output "Baked $count / $($plan.assets.Count) original assets."
