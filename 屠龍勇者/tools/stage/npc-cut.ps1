# NPC cut-out from a user illustration whose background is a green forest / grey ground (ARCHITECTURE.md section 55).
# Background = flood fill from the image border over pixels that are "not the character":
#   bright-ish (L > -Light) and not warm (R - G < -Warm: staff wood, skin stay), or green-dominant (G > R + 6, forest shadows).
# Light-coloured characters (white robe): -Light 999 turns the grey rule off so only greens (G > R + -Green) are background.
# Rows below -FeetY are dropped (ground). Keeps the largest blob, fills holes, 1.5px feathered edge, resized to -OutH tall.
# Also writes a portrait (head and shoulders, -Face x,y,w,h in source px) as jpg for dialogs.
# -Erase: polygons cleared after keying (rocks / ground that touch the character).
# -Keep: polygons copied back from the source after keying (parts the key removed, e.g. a pale crystal on a staff).
# Run from 屠龍勇者: powershell -ExecutionPolicy Bypass -File tools\stage\npc-cut.ps1 -Src tools\sprite-src\tower-keeper-src.jpg -Out images\npc\tower-keeper
param([string]$Src, [string]$Out, [int]$FeetY = 0, [int]$OutH = 360, [int]$Light = 62, [int]$Warm = 16, [int]$Green = 6, [string]$Face = '0,0,0,0', [string]$Check = '', [string]$Erase = '', [string]$Keep = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class NpcCut {
    public static Bitmap Cut(Bitmap src, int light, int warm, int green, int feetY) {
        int W = src.Width, H = feetY > 0 ? Math.Min(feetY, src.Height) : src.Height;
        var d = src.LockBits(new Rectangle(0, 0, src.Width, src.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        int st = d.Stride; var a = new byte[st * src.Height]; Marshal.Copy(d.Scan0, a, 0, a.Length); src.UnlockBits(d);
        Func<int, bool> bgLike = k => { int i = (k / W) * st + (k % W) * 3; int b = a[i], g = a[i + 1], r = a[i + 2];
            double L = 0.299 * r + 0.587 * g + 0.114 * b;
            if (g > r + green) return true;                   // forest greens / teal shadows
            return L > light && r - g < warm;                  // grey ground, light fog (not wood / skin)
        };
        var bg = new bool[W * H]; var q = new Queue<int>();
        Action<int> seed = k => { if (!bg[k] && bgLike(k)) { bg[k] = true; q.Enqueue(k); } };
        for (int x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
        for (int y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) seed(k - 1); if (x < W - 1) seed(k + 1); if (y > 0) seed(k - W); if (y < H - 1) seed(k + W); }
        // largest foreground blob
        var lab = new int[W * H]; int best = 0, bestN = 0, id = 0;
        for (int k0 = 0; k0 < W * H; k0++) {
            if (bg[k0] || lab[k0] != 0) continue;
            id++; int n = 0; lab[k0] = id; q.Enqueue(k0);
            while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W; n++;
                foreach (int nk in new[] { x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1 })
                    if (nk >= 0 && !bg[nk] && lab[nk] == 0) { lab[nk] = id; q.Enqueue(nk); } }
            if (n > bestN) { bestN = n; best = id; }
        }
        // holes: anything not reachable from the border through non-blob pixels is filled
        var outside = new bool[W * H];
        Action<int> s2 = k => { if (!outside[k] && lab[k] != best) { outside[k] = true; q.Enqueue(k); } };
        for (int x = 0; x < W; x++) { s2(x); s2((H - 1) * W + x); }
        for (int y = 0; y < H; y++) { s2(y * W); s2(y * W + W - 1); }
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) s2(k - 1); if (x < W - 1) s2(k + 1); if (y > 0) s2(k - W); if (y < H - 1) s2(k + W); }
        var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        var od = o.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var ob = new byte[od.Stride * H];
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
            int k = y * W + x, i = y * st + x * 3, j = y * od.Stride + x * 4;
            // 1.5px feather: count outside pixels in the 3x3 neighbourhood
            int c = 0; for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) { int xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || outside[yy * W + xx]) c++; }
            int al = outside[k] ? 0 : (int)(255 * (1 - c / 9.0 * 0.7));
            ob[j] = a[i]; ob[j + 1] = a[i + 1]; ob[j + 2] = a[i + 2]; ob[j + 3] = (byte)al;
        }
        Marshal.Copy(ob, 0, od.Scan0, ob.Length); o.UnlockBits(od); return o;
    }
}
'@
$img = New-Object System.Drawing.Bitmap ((Resolve-Path $Src).Path)   # not $src: PowerShell names are case-insensitive and $Src is a [string] parameter
$cut = [NpcCut]::Cut($img, $Light, $Warm, $Green, $FeetY)
# -Erase "x,y x,y x,y;x,y ..." : polygons (source px) cleared after keying, for ground / rocks touching the character
if ($Erase) {
    $eg = [System.Drawing.Graphics]::FromImage($cut); $eg.CompositingMode = 'SourceCopy'; $eg.SmoothingMode = 'AntiAlias'
    $clear = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    foreach ($poly in $Erase.Split(';')) {
        $pts = $poly.Trim().Split(' ') | ForEach-Object { $xy = $_.Split(','); New-Object System.Drawing.PointF ([float]$xy[0]), ([float]$xy[1]) }
        $eg.FillPolygon($clear, [System.Drawing.PointF[]]$pts)
    }
    $eg.Dispose()
}
if ($Keep) {
    $kg = [System.Drawing.Graphics]::FromImage($cut); $kg.SmoothingMode = 'AntiAlias'
    foreach ($poly in $Keep.Split(';')) {
        $pts = $poly.Trim().Split(' ') | ForEach-Object { $xy = $_.Split(','); New-Object System.Drawing.PointF ([float]$xy[0]), ([float]$xy[1]) }
        $gp = New-Object System.Drawing.Drawing2D.GraphicsPath; $gp.AddPolygon([System.Drawing.PointF[]]$pts)
        $kg.SetClip($gp); $kg.DrawImage($img, 0, 0, $img.Width, $img.Height); $kg.ResetClip(); $gp.Dispose()
    }
    $kg.Dispose()
}
$w = [int]($cut.Width * $OutH / $cut.Height)
$o = New-Object System.Drawing.Bitmap $w, $OutH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($o); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($cut, 0, 0, $w, $OutH); $g.Dispose()
$o.Save("$Out.png", [System.Drawing.Imaging.ImageFormat]::Png)
if ($Check) {   # cut-out on magenta to spot leftovers
    $c = New-Object System.Drawing.Bitmap $cut.Width, $cut.Height; $cg = [System.Drawing.Graphics]::FromImage($c); $cg.Clear([System.Drawing.Color]::Magenta); $cg.DrawImage($cut, 0, 0); $cg.Dispose(); $c.Save($Check, [System.Drawing.Imaging.ImageFormat]::Jpeg); $c.Dispose()
}
$f = $Face.Split(',') | ForEach-Object { [int]$_ }
if ($f[2] -gt 0) {
    $p = New-Object System.Drawing.Bitmap 240, ([int](240 * $f[3] / $f[2])); $pg = [System.Drawing.Graphics]::FromImage($p); $pg.InterpolationMode = 'HighQualityBicubic'
    $pg.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $p.Width, $p.Height), (New-Object System.Drawing.Rectangle $f[0], $f[1], $f[2], $f[3]), [System.Drawing.GraphicsUnit]::Pixel); $pg.Dispose()
    $p.Save("$Out-face.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg); $p.Dispose()
}
$o.Dispose(); $cut.Dispose(); $img.Dispose()
"$Out.png ${w}x$OutH"
