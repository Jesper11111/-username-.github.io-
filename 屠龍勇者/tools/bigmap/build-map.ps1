# Build the big field map (ARCHITECTURE.md section 45).
# Sources in this folder (2000x989 each, user-generated): swamp / pond / village / meadow / beach = regions, forest + pond = forest filler.
# Output: images/maps/wild.jpg (3200x2816 = 100x88 tiles of 32px), images/maps/wild-mini.jpg (minimap), tools/bigmap/auto-mask.txt
#         (per-tile guess: '.' walkable, '#' blocked; Claude then hand-edits it into data/bigmap.js) and tools/bigmap/mask-check.jpg.
# Run from the game folder: powershell -ExecutionPolicy Bypass -File tools\bigmap\build-map.ps1
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent $dir)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class BigMap {
  static byte[] Bytes(Bitmap o, out BitmapData d) { d = o.LockBits(new Rectangle(0,0,o.Width,o.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb); var b = new byte[d.Stride*o.Height]; Marshal.Copy(d.Scan0, b, 0, b.Length); return b; }
  static void Put(Bitmap o, BitmapData d, byte[] b) { Marshal.Copy(b, 0, d.Scan0, b.Length); o.UnlockBits(d); }
  // scaled copy with optional tone (brightness mul, saturation mul) and feathered edges (fl,ft,fr,fb = feather px, 0 = hard edge)
  public static Bitmap Region(Bitmap src, int w, int h, double bri, double sat, int fl, int ft, int fr, int fb) {
    var o = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) { g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic; g.DrawImage(src, 0, 0, w, h); }
    BitmapData d; var b = Bytes(o, out d);
    for (int y=0;y<h;y++) for (int x=0;x<w;x++) {
      int i = y*d.Stride + x*4;
      if (bri != 1 || sat != 1) {
        double B = b[i], G = b[i+1], R = b[i+2], L = 0.299*R + 0.587*G + 0.114*B;
        R = (L + (R-L)*sat)*bri; G = (L + (G-L)*sat)*bri; B = (L + (B-L)*sat)*bri;
        b[i] = (byte)Math.Max(0,Math.Min(255,B)); b[i+1] = (byte)Math.Max(0,Math.Min(255,G)); b[i+2] = (byte)Math.Max(0,Math.Min(255,R));
      }
      double a = 1;
      if (fl > 0 && x < fl) a = Math.Min(a, (double)x/fl);
      if (fr > 0 && w-1-x < fr) a = Math.Min(a, (double)(w-1-x)/fr);
      if (ft > 0 && y < ft) a = Math.Min(a, (double)y/ft);
      if (fb > 0 && h-1-y < fb) a = Math.Min(a, (double)(h-1-y)/fb);
      a = a*a*(3-2*a); b[i+3] = (byte)(255*a);
    }
    Put(o, d, b); return o;
  }
  // per-tile walkability guess: water (blue) and dark forest are blocked
  public static string Mask(Bitmap m, int tile) {
    int tw = m.Width / tile, th = m.Height / tile;
    BitmapData d; var b = Bytes(m, out d);
    var s = new System.Text.StringBuilder();
    for (int ty=0; ty<th; ty++) {
      for (int tx=0; tx<tw; tx++) {
        double sl = 0, dark = 0, blue = 0; int n = 0;
        for (int y=ty*tile; y<(ty+1)*tile; y+=2) for (int x=tx*tile; x<(tx+1)*tile; x+=2) {
          int i = y*d.Stride + x*4; double B = b[i], G = b[i+1], R = b[i+2], L = 0.299*R + 0.587*G + 0.114*B;
          sl += L; if (L < 58) dark++; if (B > R + 18 && B > G - 4 && L > 70) blue++; n++;
        }
        double ml = sl/n, fd = dark/n, fb = blue/n;
        s.Append(fb > 0.45 ? '~' : (fd > 0.42 || ml < 66) ? '#' : '.');
      }
      s.Append('\n');
    }
    m.UnlockBits(d); return s.ToString();
  }
  // mask overlay for checking: blocked tiles tinted red, water blue
  public static void Overlay(Bitmap m, string mask, int tile) {
    var rows = mask.Trim().Split('\n');
    using (var g = Graphics.FromImage(m)) {
      var red = new SolidBrush(Color.FromArgb(90, 255, 0, 0)); var blu = new SolidBrush(Color.FromArgb(90, 0, 80, 255));
      for (int y=0;y<rows.Length;y++) for (int x=0;x<rows[y].Length;x++) {
        char c = rows[y][x]; if (c == '#') g.FillRectangle(red, x*tile, y*tile, tile, tile); else if (c == '~') g.FillRectangle(blu, x*tile, y*tile, tile, tile); }
      var pen = new Pen(Color.FromArgb(60, 255, 255, 255));
      for (int x=0;x<=m.Width;x+=tile*10) g.DrawLine(pen, x, 0, x, m.Height);
      for (int y=0;y<=m.Height;y+=tile*10) g.DrawLine(pen, 0, y, m.Width, y);
    }
  }
}
'@
$W = 3200; $H = 2816; $RW = 1600; $RH = 791; $F = 112
$out = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($out); $g.Clear([System.Drawing.Color]::FromArgb(28, 36, 27))
$g.InterpolationMode = 'HighQualityBicubic'
# forest filler: three crops (700x760 source) drawn at 560x608, mirrored variants, rows offset by half a tile
$tiles = @()
foreach ($c in @(@('forest.jpg', 1000, 200), @('pond.jpg', 1300, 150), @('forest.jpg', 1250, 180))) {
    $src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $c[0]))
    $crop = $src.Clone((New-Object System.Drawing.Rectangle $c[1], $c[2], 700, 760), $src.PixelFormat); $src.Dispose()
    $tiles += [BigMap]::Region($crop, 560, 608, 1, 1, 50, 50, 50, 50)
    $crop.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
    $tiles += [BigMap]::Region($crop, 560, 608, 1, 1, 50, 50, 50, 50); $crop.Dispose()
}
$i = 0; $row = 0
for ($ty = -200; $ty -lt $H; $ty += 520) {
    for ($tx = -(($row % 2) * 280) - 40; $tx -lt $W; $tx += 480) { $g.DrawImage($tiles[($i * 3 + $row) % $tiles.Count], $tx, $ty, 560, 608); $i++ }
    $row++
}
# regions: file, x, y, brightness, saturation (meadow toned down to match the foggy maps); edges on the map border are not feathered
$regions = @(
    @('swamp.jpg', 0, 0, 1, 1), @('pond.jpg', 1600, 0, 1, 1), @('village.jpg', 800, 671, 1, 1),
    @('meadow.jpg', 664, 1342, 0.8, 0.78), @('beach.jpg', 1304, ($H - $RH), 1, 1)
)
foreach ($r in $regions) {
    $src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $r[0]))
    $x = [int]$r[1]; $y = [int]$r[2]
    $fl = if ($x -le 0) { 0 } else { $F }; $ft = if ($y -le 0) { 0 } else { $F }
    $fr = if ($x + $RW -ge $W) { 0 } else { $F }; $fb = if ($y + $RH -ge $H) { 0 } else { $F }
    $im = [BigMap]::Region($src, $RW, $RH, [double]$r[3], [double]$r[4], $fl, $ft, $fr, $fb); $src.Dispose()
    $g.DrawImage($im, $x, $y, $RW, $RH); $im.Dispose()
}
$g.Dispose()
foreach ($t in $tiles) { $t.Dispose() }
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L
$out.Save((Join-Path $root 'images\maps\wild.jpg'), $enc, $ep)
$mini = New-Object System.Drawing.Bitmap 320, 282; $mg = [System.Drawing.Graphics]::FromImage($mini); $mg.InterpolationMode = 'HighQualityBicubic'; $mg.DrawImage($out, 0, 0, 320, 282); $mg.Dispose()
$mini.Save((Join-Path $root 'images\maps\wild-mini.jpg'), $enc, $ep); $mini.Dispose()
$mask = [BigMap]::Mask($out, 32)
[IO.File]::WriteAllText((Join-Path $dir 'auto-mask.txt'), $mask)
$out.Dispose()
"wild.jpg $([Math]::Round((Get-Item (Join-Path $root 'images\maps\wild.jpg')).Length / 1KB)) KB"
