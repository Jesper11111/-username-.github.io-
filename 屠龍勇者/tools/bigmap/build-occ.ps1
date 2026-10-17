# Build the occlusion depth map for the big map (ARCHITECTURE.md section 46).
# Output images/maps/wild-occ.png: 800x704 (1 cell = 4x4 px of wild.jpg). Red channel = 0 not an occluder, else (base tile row + 1):
# the row where the object stands. In game, an actor whose feet are above (north of) that row is drawn behind those pixels.
#  - trees: auto -- dark green/teal cells; each column run of foliage cells takes the row where the run ends, kept only if it ends on a blocked tile
#  - man-made props (tent, walls, wells...): polygons in walk.json "occluders" [{ "base": row, "poly": [[x,y],...] }] in tile units (32 px)
# Also writes tools/bigmap/occ-check.jpg (occluders tinted by depth) for checking.
# Run from the game folder: powershell -ExecutionPolicy Bypass -File tools\bigmap\build-occ.ps1
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent $dir)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices; using System.Collections.Generic;
public static class Occ {
  public const int C = 4, T = 32;
  // blocked[ty*100+tx] = true for blocked tiles
  public static byte[] Trees(Bitmap img, bool[] blocked, int tw, int th) {
    int W = img.Width / C, H = img.Height / C;
    var d = img.LockBits(new Rectangle(0,0,img.Width,img.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
    var b = new byte[d.Stride*img.Height]; Marshal.Copy(d.Scan0, b, 0, b.Length); img.UnlockBits(d);
    var fol = new bool[W*H]; var lum = new double[W*H];
    for (int cy=0; cy<H; cy++) for (int cx=0; cx<W; cx++) {
      double R=0,G=0,B=0; for (int y=0;y<C;y++) for (int x=0;x<C;x++) { int i=(cy*C+y)*d.Stride+(cx*C+x)*3; B+=b[i]; G+=b[i+1]; R+=b[i+2]; }
      R/=C*C; G/=C*C; B/=C*C; double L = 0.299*R+0.587*G+0.114*B;
      lum[cy*W+cx] = L;
      // pine foliage: dark (forest averages L~52, meadow grass ~80-90 with shadowed cells down to ~65), not red-dominant, not blue water
      fol[cy*W+cx] = L < 62 && G >= R - 6 && B < G + 25;
    }
    // a dark cell is foliage only if its 5x5 neighbourhood is dark too (single shadowed grass cells are not trees)
    var fol2 = new bool[W*H];
    for (int cy=0; cy<H; cy++) for (int cx=0; cx<W; cx++) {
      if (!fol[cy*W+cx]) continue;
      double s = 0; int n = 0;
      for (int y=Math.Max(0,cy-2); y<=Math.Min(H-1,cy+2); y++) for (int x=Math.Max(0,cx-2); x<=Math.Min(W-1,cx+2); x++) { s += lum[y*W+x]; n++; }
      fol2[cy*W+cx] = s/n < 64;
    }
    fol = fol2;
    // base row: foliage on a blocked tile stands on that tile; foliage over a walkable tile is the canopy of a tree
    // standing on the first blocked tile below it (within 3 tiles), otherwise it is just dark ground (not an occluder)
    var o = new byte[W*H];
    for (int cy=0; cy<H; cy++) for (int cx=0; cx<W; cx++) {
      if (!fol[cy*W+cx]) continue;
      int tr = Math.Min(th-1, (cy*C)/T), tc = Math.Min(tw-1, (cx*C)/T);
      if (blocked[tr*tw+tc]) { o[cy*W+cx] = (byte)(tr + 1); continue; }
      for (int k=1; k<=3 && tr+k<th; k++) if (blocked[(tr+k)*tw+tc]) { o[cy*W+cx] = (byte)(tr + k + 1); break; }
    }
    return o;
  }
  public static void Poly(byte[] o, int W, int H, double[] xs, double[] ys, int baseRow) {
    double minY=1e9, maxY=-1e9; foreach (var y in ys) { minY=Math.Min(minY,y); maxY=Math.Max(maxY,y); }
    int y0 = Math.Max(0,(int)(minY*T/C)), y1 = Math.Min(H-1,(int)(maxY*T/C));
    for (int cy=y0; cy<=y1; cy++) {
      double py = (cy+0.5)*C/(double)T; var xsHit = new List<double>();
      for (int i=0;i<xs.Length;i++) { int j=(i+1)%xs.Length; double ya=ys[i], yb=ys[j];
        if ((ya<=py && yb>py) || (yb<=py && ya>py)) xsHit.Add(xs[i] + (py-ya)/(yb-ya)*(xs[j]-xs[i])); }
      xsHit.Sort();
      for (int k=0;k+1<xsHit.Count;k+=2) { int a=Math.Max(0,(int)(xsHit[k]*T/C)), bb=Math.Min(W-1,(int)(xsHit[k+1]*T/C));
        for (int cx=a; cx<=bb; cx++) o[cy*W+cx] = (byte)(baseRow+1); }
    }
  }
  public static void Save(byte[] o, int W, int H, string path) {
    var bm = new Bitmap(W, H, PixelFormat.Format24bppRgb);
    var d = bm.LockBits(new Rectangle(0,0,W,H), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
    var b = new byte[d.Stride*H];
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) { int i=y*d.Stride+x*3; b[i+2]=o[y*W+x]; }
    Marshal.Copy(b,0,d.Scan0,b.Length); bm.UnlockBits(d); bm.Save(path, ImageFormat.Png); bm.Dispose();
  }
  public static void Check(Bitmap img, byte[] o, int W, int H, string path) {
    var bm = new Bitmap(img.Width/2, img.Height/2);
    using (var g = Graphics.FromImage(bm)) {
      g.DrawImage(img, 0, 0, bm.Width, bm.Height);
      for (int y=0;y<H;y++) for (int x=0;x<W;x++) { int v=o[y*W+x]; if (v==0) continue;
        int hue = (v*37)%360; var c = FromHue(hue);
        using (var br = new SolidBrush(Color.FromArgb(110, c))) g.FillRectangle(br, x*2, y*2, 2, 2); }
    }
    bm.Save(path, ImageFormat.Jpeg); bm.Dispose();
  }
  static Color FromHue(int h) { double x = 1 - Math.Abs((h/60.0)%2 - 1); double r=0,g=0,b=0;
    if (h<60){r=1;g=x;} else if(h<120){r=x;g=1;} else if(h<180){g=1;b=x;} else if(h<240){g=x;b=1;} else if(h<300){r=x;b=1;} else {r=1;b=x;}
    return Color.FromArgb((int)(r*255),(int)(g*255),(int)(b*255)); }
}
'@
$j = Get-Content (Join-Path $dir 'walk.json') -Raw | ConvertFrom-Json
$img0 = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'images\maps\wild.jpg')); $tw = $img0.Width / 32; $th = $img0.Height / 32; $img0.Dispose()
$blocked = New-Object 'bool[]' ($tw * $th); for ($i = 0; $i -lt $blocked.Length; $i++) { $blocked[$i] = $true }
foreach ($r in $j.walk) { for ($y = $r[1]; $y -le $r[3]; $y++) { for ($x = $r[0]; $x -le $r[2]; $x++) { $blocked[$y * $tw + $x] = $false } } }
foreach ($r in $j.block) { for ($y = $r[1]; $y -le $r[3]; $y++) { for ($x = $r[0]; $x -le $r[2]; $x++) { $blocked[$y * $tw + $x] = $true } } }
$img = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'images\maps\wild.jpg'))
$W = $img.Width / 4; $H = $img.Height / 4
$o = [Occ]::Trees($img, $blocked, $tw, $th)
foreach ($r in $j.noocc) { for ($cy = $r[1] * 8; $cy -lt ($r[3] + 1) * 8; $cy++) { for ($cx = $r[0] * 8; $cx -lt ($r[2] + 1) * 8; $cx++) { $o[$cy * $W + $cx] = 0 } } }
foreach ($p in $j.occluders) {
    $xs = [double[]]($p.poly | ForEach-Object { $_[0] }); $ys = [double[]]($p.poly | ForEach-Object { $_[1] })
    [Occ]::Poly($o, $W, $H, $xs, $ys, [int]$p.base)
}
[Occ]::Save($o, $W, $H, (Join-Path $root 'images\maps\wild-occ.png'))
[Occ]::Check($img, $o, $W, $H, (Join-Path $dir 'occ-check.jpg'))
$img.Dispose()
$n = ($o | Where-Object { $_ -gt 0 }).Count
"occluder cells: $n of $($o.Length)"
