$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public class SingleItemCrop {
 public static void Run(string src,string dest) {
  using(var im=new Bitmap(src)) {
   var d=im.LockBits(new Rectangle(0,0,im.Width,im.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   var p=new byte[d.Stride*im.Height];Marshal.Copy(d.Scan0,p,0,p.Length);
   int x0=im.Width,y0=im.Height,x1=0,y1=0;
   for(int y=0;y<im.Height;y++)for(int x=0;x<im.Width;x++)if(p[y*d.Stride+x*4+3]>5){x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}
   im.UnlockBits(d);
   using(var o=new Bitmap(128,128))using(var g=Graphics.FromImage(o)) {
    float w=x1-x0+1,h=y1-y0+1,k=112/Math.Max(w,h);
    g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
    g.DrawImage(im,new RectangleF((128-w*k)/2,(128-h*k)/2,w*k,h*k),new RectangleF(x0,y0,w,h),GraphicsUnit.Pixel);o.Save(dest,ImageFormat.Png);
   }
  }
 }
}
'@
$projectRoot=Split-Path $PSScriptRoot -Parent
$entries=(Get-Content (Join-Path $PSScriptRoot 'item-art-single.json') -Raw -Encoding UTF8 | ConvertFrom-Json).images
foreach($entry in $entries){
 $source=Join-Path $PSScriptRoot ('icon-src\items\'+$entry.id+'.png')
 $output=Join-Path $projectRoot ('images\icons\items\'+$entry.id+'.png')
 if(!(Test-Path -LiteralPath $source)){Copy-Item -LiteralPath $entry.source -Destination $source}
 if(!(Test-Path -LiteralPath $output)){[SingleItemCrop]::Run($source,$output)}
}
