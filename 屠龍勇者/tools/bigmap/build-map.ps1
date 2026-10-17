# Build the big field map (ARCHITECTURE.md section 45).
# Sources in this folder (2000x989 each, user-generated): swamp / pond-snow / village / meadow / beach / oasis / pyramid = regions,
#   forest + pond = forest filler, pond-snow right half = snow filler, oasis / pyramid edges = desert filler.
# Output: images/maps/wild.jpg (4512x3584 = 141x112 tiles of 32px; east part added 2026-10-18: snow, oasis, pyramid; south row: mine.jpg x2 + dragon-cave.jpg), images/maps/wild-mini.jpg (minimap), tools/bigmap/auto-mask.txt
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
$W = 4512; $H = 3584; $RW = 1600; $RH = 791; $F = 112
$out = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($out); $g.Clear([System.Drawing.Color]::FromArgb(28, 36, 27))
$g.InterpolationMode = 'HighQualityBicubic'
# forest filler: three crops (700x760 source) drawn at 560x608, mirrored variants, rows offset by half a tile
# filler sets (crop file, x, y, w, h): forest everywhere, snow in the north-east, desert in the south-east (2026-10-18 east extension)
function FillerSet($list, $fe) {
    $set = @()
    foreach ($c in $list) {
        $src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $c[0]))
        $crop = $src.Clone((New-Object System.Drawing.Rectangle $c[1], $c[2], $c[3], $c[4]), $src.PixelFormat); $src.Dispose()
        $set += [BigMap]::Region($crop, 560, 608, 1, 1, $fe, $fe, $fe, $fe)
        $crop.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
        $set += [BigMap]::Region($crop, 560, 608, 1, 1, $fe, $fe, $fe, $fe); $crop.Dispose()
    }
    return ,$set
}
$forestT = FillerSet @(@('forest.jpg', 1000, 200, 700, 760), @('pond.jpg', 1300, 150, 700, 760), @('forest.jpg', 1250, 180, 700, 760)) 50
$snowT = FillerSet @(@('pond-snow.jpg', 1450, 250, 550, 600), @('pond-snow.jpg', 1400, 380, 600, 560)) 150
$desertT = FillerSet @(@('oasis.jpg', 1480, 120, 520, 600), @('pyramid.jpg', 1420, 80, 580, 640), @('pyramid.jpg', 0, 60, 520, 560)) 150
$tiles = $forestT + $snowT + $desertT
# pass 1: forest everywhere; pass 2: snow (north-east) / desert (south-east) on top with wide soft edges so the borders blend
foreach ($pass in 1, 2) {
    $i = 0; $row = 0
    $sy = if ($pass -eq 1) { 520 } else { 300 }; $sx = if ($pass -eq 1) { 480 } else { 280 }   # pass 2 overlaps densely so the soft edges cover each other
    for ($ty = -200; $ty -lt $H; $ty += $sy) {
        for ($tx = -(($row % 2) * 280) - 40; $tx -lt $W; $tx += $sx) {
            $cx = $tx + 280; $cy = $ty + 304
            $set = if ($pass -eq 1) { $forestT } elseif ($cx -gt 3150 -and $cy -lt 1200) { $snowT } elseif ($cx -gt 3150 -or ($cx -gt 2500 -and $cy -gt 1900)) { $desertT } else { $null }
            if ($set) { $g.DrawImage($set[($i * 3 + $row) % $set.Count], $tx, $ty, 560, 608) }
            $i++ }
        $row++
    }
}
# regions: file, x, y, brightness, saturation (meadow toned down to match the foggy maps); edges on the map border are not feathered
$regions = @(
    @('swamp.jpg', 0, 0, 1, 1), @('pond-snow.jpg', 1600, 0, 1, 1), @('village.jpg', 800, 671, 1, 1),
    @('oasis.jpg', 2240, 1300, 0.92, 0.9), @('pyramid.jpg', 2904, 2025, 0.92, 0.9),
    @('meadow.jpg', 664, 1342, 0.8, 0.78), @('beach.jpg', 1304, 2025, 1, 1),
    # 2026-10-18 south row (section 49): mine upper / dragon cave / mine deep (same picture as upper, mirrored and darker; kept apart so the copy is not obvious)
    @('mine.jpg', 0, ($H - $RH), 1, 1), @('dragon-cave.jpg', 1456, ($H - $RH), 1, 1), @('mine.jpg', 2912, ($H - $RH), 0.8, 0.88, 'flip')
)
foreach ($r in $regions) {
    $src = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $r[0]))
    if ($r.Count -gt 5 -and $r[5] -eq 'flip') { $src.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
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
$mini = New-Object System.Drawing.Bitmap 400, 318; $mg = [System.Drawing.Graphics]::FromImage($mini); $mg.InterpolationMode = 'HighQualityBicubic'; $mg.DrawImage($out, 0, 0, 400, 318); $mg.Dispose()
$mini.Save((Join-Path $root 'images\maps\wild-mini.jpg'), $enc, $ep); $mini.Dispose()
$mask = [BigMap]::Mask($out, 32)
[IO.File]::WriteAllText((Join-Path $dir 'auto-mask.txt'), $mask)
$out.Dispose()
"wild.jpg $([Math]::Round((Get-Item (Join-Path $root 'images\maps\wild.jpg')).Length / 1KB)) KB"
