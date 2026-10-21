# 依透明連通區分出道具，避免生成圖示略越格時裁掉刀尖；只寫新道具圖，不修改原稿。
param([switch]$ReplaceGenerated)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class ItemArtCutter {
 public static string Cut(string source,string[] outputs,bool replace) {
  using(var im=new Bitmap(source)) {
   int w=im.Width,h=im.Height; var rect=new Rectangle(0,0,w,h);
   var data=im.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   var pixels=new byte[data.Stride*h];Marshal.Copy(data.Scan0,pixels,0,pixels.Length);int stride=data.Stride;im.UnlockBits(data);
   var seen=new bool[w*h];var groups=new List<int>[16];for(int i=0;i<16;i++)groups[i]=new List<int>();
   var q=new int[w*h];
   for(int y=0;y<h;y++)for(int x=0;x<w;x++) {
    int seed=y*w+x;if(seen[seed]||pixels[y*stride+x*4+3]<6)continue;
    int head=0,tail=1;q[0]=seed;seen[seed]=true;long sumX=0,sumY=0;
    while(head<tail){int p=q[head++],px=p%w,py=p/w;sumX+=px;sumY+=py;
     for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){int nx=px+dx,ny=py+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;int np=ny*w+nx;if(!seen[np]&&pixels[ny*stride+nx*4+3]>=6){seen[np]=true;q[tail++]=np;}}
    }
    if(tail<8)continue;int col=Math.Min(3,(int)(sumX*4/tail/w)),row=Math.Min(3,(int)(sumY*4/tail/h));
    for(int i=0;i<tail;i++)groups[row*4+col].Add(q[i]);
   }
   var counts=new List<string>();
   for(int cell=0;cell<outputs.Length;cell++) {
    if(System.IO.File.Exists(outputs[cell])&&!replace)throw new Exception("Already exists: "+outputs[cell]);
    var group=groups[cell];if(group.Count<120)throw new Exception("Empty item cell "+cell+" in "+source);
    int x0=w,y0=h,x1=0,y1=0;foreach(int p in group){int x=p%w,y=p/w;x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}
    int bw=x1-x0+1,bh=y1-y0+1;
    if(bw>w*.48||bh>h*.48)throw new Exception("Joined icons at cell "+cell+" in "+source);
    using(var cut=new Bitmap(bw,bh,PixelFormat.Format32bppArgb)) {
     foreach(int p in group){int x=p%w,y=p/w,i=y*stride+x*4;cut.SetPixel(x-x0,y-y0,Color.FromArgb(pixels[i+3],pixels[i+2],pixels[i+1],pixels[i]));}
     using(var output=new Bitmap(128,128,PixelFormat.Format32bppArgb))using(var g=Graphics.FromImage(output)){
      g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      float k=112f/Math.Max(bw,bh),dw=bw*k,dh=bh*k;g.DrawImage(cut,(128-dw)/2,(128-dh)/2,dw,dh);output.Save(outputs[cell],ImageFormat.Png);
     }
    }
    counts.Add(cell+":"+group.Count);
   }
   return string.Join(" ",counts);
  }
 }
}
'@
$projectRoot=Split-Path $PSScriptRoot -Parent
$sourceDir=Join-Path $PSScriptRoot 'icon-src\items'
$outputDir=Join-Path $projectRoot 'images\icons\items'
New-Item -ItemType Directory -Force -Path $sourceDir,$outputDir | Out-Null
$batches=(Get-Content (Join-Path $PSScriptRoot 'item-art-batches.json') -Raw -Encoding UTF8 | ConvertFrom-Json).batches
$art=(Get-Content (Join-Path $PSScriptRoot 'item-art-generated.json') -Raw -Encoding UTF8 | ConvertFrom-Json).images
foreach($entry in $art){
 $localSource=Join-Path $sourceDir ($entry.id+'.png')
 if(!(Test-Path -LiteralPath $localSource)){Copy-Item -LiteralPath $entry.source -Destination $localSource}
 $batch=$batches | Where-Object id -eq $entry.id
 [string[]]$outputs=@($batch.items | ForEach-Object {Join-Path $outputDir ($_.id+'.png')})
 Write-Output ($entry.id+' '+[ItemArtCutter]::Cut($localSource,$outputs,[bool]$ReplaceGenerated))
}
