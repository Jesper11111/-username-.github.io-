# Check that an AI-repainted seam image is still aligned with the original crop (section 58).
# Compares fixed/<id>.* (scaled to 1024) with todo/<id>-orig.png OUTSIDE the magenta band, for shifts of -24..24 px.
# Best shift should be 0,0 with a low mean difference; otherwise the paste would ghost.
# Run from the game folder: powershell -ExecutionPolicy Bypass -File tools\bigmap\seams\seam-check.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class SeamCheck {
  static byte[] Bytes(Bitmap o, out int stride) { var d = o.LockBits(new Rectangle(0,0,o.Width,o.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb); var b = new byte[d.Stride*o.Height]; Marshal.Copy(d.Scan0, b, 0, b.Length); stride = d.Stride; o.UnlockBits(d); return b; }
  // mean abs luminance difference outside the band, for offset (dx,dy) of the fixed image
  public static double Diff(Bitmap a, Bitmap f, bool vertical, int bandLo, int bandHi, int dx, int dy) {
    int sa, sf; var A = Bytes(a, out sa); var F = Bytes(f, out sf); int S = a.Width; double sum = 0; long n = 0;
    for (int y=40;y<S-40;y+=3) for (int x=40;x<S-40;x+=3) {
      int c = vertical ? x : y; if (c >= bandLo - 160 && c <= bandHi + 160) continue;
      int fx = x+dx, fy = y+dy; if (fx<0||fy<0||fx>=S||fy>=S) continue;
      int i = y*sa+x*4, j = fy*sf+fx*4;
      double la = 0.299*A[i+2]+0.587*A[i+1]+0.114*A[i], lf = 0.299*F[j+2]+0.587*F[j+1]+0.114*F[j];
      sum += Math.Abs(la-lf); n++;
    }
    return sum / n;
  }
}
'@
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfg = [IO.File]::ReadAllText((Join-Path $dir 'patches.json'), (New-Object System.Text.UTF8Encoding $false)) | ConvertFrom-Json
$S = [int]$cfg.size
foreach ($p in $cfg.patches) {
    $f = Get-ChildItem (Join-Path $dir 'fixed') -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $p.id } | Select-Object -First 1
    if (-not $f) { continue }
    $orig = [System.Drawing.Bitmap]::FromFile((Join-Path $dir "todo\$($p.id)-orig.png"))
    $raw = [System.Drawing.Image]::FromFile($f.FullName)
    $fix = New-Object System.Drawing.Bitmap $S, $S; $g = [System.Drawing.Graphics]::FromImage($fix); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($raw, 0, 0, $S, $S); $g.Dispose(); $raw.Dispose()
    $v = $p.orient -eq 'v'; $c = if ($v) { [int]$p.at - [int]$p.x } else { [int]$p.at - [int]$p.y }
    $best = $null
    foreach ($dy in -24..24) { if ($dy % 4) { continue }; foreach ($dx in -24..24) { if ($dx % 4) { continue }
        $d = [SeamCheck]::Diff($orig, $fix, $v, $c - [int]$p.band, $c + [int]$p.band, $dx, $dy)
        if (-not $best -or $d -lt $best[0]) { $best = @($d, $dx, $dy) } } }
    $zero = [SeamCheck]::Diff($orig, $fix, $v, $c - [int]$p.band, $c + [int]$p.band, 0, 0)
    "{0}: diff at 0,0 = {1:N1}; best shift {2},{3} = {4:N1}" -f $p.id, $zero, $best[1], $best[2], $best[0]
    $orig.Dispose(); $fix.Dispose()
}
