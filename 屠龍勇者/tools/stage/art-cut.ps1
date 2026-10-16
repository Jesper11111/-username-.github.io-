# Class portrait from a user-supplied illustration (Windows; tools/stage/artcut.py needed Python + Segment Anything).
#  1) 16:9 banner images/classes/<cls>.jpg (960x536), cropped at -BannerY (source px, top of crop; width = full image)
#  2) full-body cut-out images/classes/hero/<cls>.png by colour keying: background = saturated purple/blue (B > G, chroma >= -Chroma)
#     flood-filled from the image border; keeps the largest blob, fills holes, 1.5px feathered edge, resized to -HeroH tall.
#     Works when the background is a strongly tinted colour and the character is neutral (black / grey / white) or warm (orange blades).
# Run from 屠龍勇者: powershell -ExecutionPolicy Bypass -File tools\stage\art-cut.ps1 -Src tools\sprite-src\darkelf-art-src.jpg -Cls darkelf -BannerY 120
param([string]$Src, [string]$Cls, [int]$BannerY = 0, [int]$HeroH = 700, [int]$Chroma = 26, [int]$BlueOverGreen = 12, [string]$Protect = '0,0,0,0')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class ArtCut {
    public static Bitmap Cut(Bitmap src, int chroma, int bog, int px0, int py0, int px1, int py1) {
        int W = src.Width, H = src.Height;
        var d = src.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        int st = d.Stride; var a = new byte[st * H]; Marshal.Copy(d.Scan0, a, 0, a.Length); src.UnlockBits(d);
        Func<int, bool> bgLike = k => { int i = (k / W) * st + (k % W) * 3; int b = a[i], g = a[i + 1], r = a[i + 2];
            int mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
            return (mx - mn) >= chroma && b >= g + bog && r + 20 >= g; };   // purple / violet / blue
        var bg = new bool[W * H]; var q = new Queue<int>();
        Action<int> seed = k => { if (!bg[k] && bgLike(k)) { bg[k] = true; q.Enqueue(k); } };
        for (int x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
        for (int y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) seed(k - 1); if (x < W - 1) seed(k + 1); if (y > 0) seed(k - W); if (y < H - 1) seed(k + W); }
        // pass 2: from the background, also eat dark purple smoke / tendrils (darker and less saturated than the backdrop);
        // faces are brighter (lum >= 100) and black hair / clothes are neutral (chroma < 24), so they stop the flood
        Func<int, bool> darkTint = k => { int i = (k / W) * st + (k % W) * 3; int b = a[i], g = a[i + 1], r = a[i + 2];
            int mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
            return (mx - mn) >= 24 && b >= g + 12 && (r + g + b) / 3 < 100; };
        Func<int, bool> prot = k => { int x = k % W, y = k / W; return x >= px0 && x < px1 && y >= py0 && y < py1; };   // -Protect: head / hair area pass 2 must not eat
        Action<int> seed2 = k => { if (!bg[k] && (bgLike(k) || (darkTint(k) && !prot(k)))) { bg[k] = true; q.Enqueue(k); } };
        for (int k = 0; k < W * H; k++) if (bg[k]) q.Enqueue(k);
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) seed2(k - 1); if (x < W - 1) seed2(k + 1); if (y > 0) seed2(k - W); if (y < H - 1) seed2(k + W); }
        Func<int, bool> anyBg = k => bgLike(k) || darkTint(k);
        // largest foreground blob only (drops dark tendrils that are not touching the character)
        var lbl = new int[W * H]; int best = 0, bestN = 0, id = 0;
        for (int k0 = 0; k0 < W * H; k0++) { if (bg[k0] || lbl[k0] != 0) continue; id++; int n = 0; lbl[k0] = id; q.Enqueue(k0);
            while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W; n++;
                if (x > 0 && !bg[k - 1] && lbl[k - 1] == 0) { lbl[k - 1] = id; q.Enqueue(k - 1); }
                if (x < W - 1 && !bg[k + 1] && lbl[k + 1] == 0) { lbl[k + 1] = id; q.Enqueue(k + 1); }
                if (y > 0 && !bg[k - W] && lbl[k - W] == 0) { lbl[k - W] = id; q.Enqueue(k - W); }
                if (y < H - 1 && !bg[k + W] && lbl[k + W] == 0) { lbl[k + W] = id; q.Enqueue(k + W); } }
            if (n > bestN) { bestN = n; best = id; } }
        var fg = new bool[W * H]; for (int k = 0; k < W * H; k++) fg[k] = lbl[k] == best;
        // big bright-purple patches enclosed by the body (backdrop seen through a gap) -> transparent
        var vis = new bool[W * H]; var patch = new List<int>();
        for (int k0 = 0; k0 < W * H; k0++) { if (!fg[k0] || vis[k0] || !bgLike(k0)) continue;
            patch.Clear(); vis[k0] = true; q.Enqueue(k0);
            while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W; patch.Add(k);
                foreach (int kk in new[] { x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1 })
                    if (kk >= 0 && fg[kk] && !vis[kk] && bgLike(kk)) { vis[kk] = true; q.Enqueue(kk); } }
            if (patch.Count > W * H / 1500) foreach (int k in patch) fg[k] = false; }
        // fill holes: background not reachable from the border becomes foreground
        var outside = new bool[W * H];
        Action<int> s2 = k => { if (!fg[k] && !outside[k]) { outside[k] = true; q.Enqueue(k); } };
        for (int x = 0; x < W; x++) { s2(x); s2((H - 1) * W + x); } for (int y = 0; y < H; y++) { s2(y * W); s2(y * W + W - 1); }
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) s2(k - 1); if (x < W - 1) s2(k + 1); if (y > 0) s2(k - W); if (y < H - 1) s2(k + W); }
        // large enclosed gaps that are background-coloured (e.g. purple seen between arm and body) stay transparent
        var seen = new bool[W * H]; var comp = new List<int>();
        for (int k0 = 0; k0 < W * H; k0++) { if (fg[k0] || outside[k0] || seen[k0]) continue;
            comp.Clear(); int nb = 0; seen[k0] = true; q.Enqueue(k0);
            while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W; comp.Add(k); if (anyBg(k)) nb++;
                if (x > 0 && !fg[k - 1] && !seen[k - 1]) { seen[k - 1] = true; q.Enqueue(k - 1); }
                if (x < W - 1 && !fg[k + 1] && !seen[k + 1]) { seen[k + 1] = true; q.Enqueue(k + 1); }
                if (y > 0 && !fg[k - W] && !seen[k - W]) { seen[k - W] = true; q.Enqueue(k - W); }
                if (y < H - 1 && !fg[k + W] && !seen[k + W]) { seen[k + W] = true; q.Enqueue(k + W); } }
            if (comp.Count > W * H / 1500 && nb > comp.Count * 0.6) foreach (int k in comp) outside[k] = true; }
        // alpha with a small blur for a soft edge
        var al = new float[W * H]; for (int k = 0; k < W * H; k++) al[k] = outside[k] ? 0 : 1;
        var al2 = new float[W * H];
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) { float s = 0; int c = 0;
            for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) { int xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; s += al[yy * W + xx]; c++; }
            al2[y * W + x] = s / c; }
        var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        var od = o.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var ob = new byte[od.Stride * H]; int minX = W, minY = H, maxX = 0, maxY = 0;
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) { int k = y * W + x, i = y * st + x * 3, j = y * od.Stride + x * 4;
            byte A = (byte)Math.Round(al2[k] * 255); ob[j] = a[i]; ob[j + 1] = a[i + 1]; ob[j + 2] = a[i + 2]; ob[j + 3] = A;
            if (A > 20) { minX = Math.Min(minX, x); maxX = Math.Max(maxX, x); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y); } }
        Marshal.Copy(ob, 0, od.Scan0, ob.Length); o.UnlockBits(od);
        var c2 = o.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb); o.Dispose(); return c2;
    }
}
'@
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Src).Path)
function Save-Jpeg($bmp, $path, $q) {
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $p = New-Object System.Drawing.Imaging.EncoderParameters 1
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
    $bmp.Save($path, $enc, $p)
}
function Resized($bmp, $w, $h, $sx, $sy, $sw, $sh, $fmt) {
    $o = New-Object System.Drawing.Bitmap $w, $h, $fmt
    $g = [System.Drawing.Graphics]::FromImage($o); $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), $sx, $sy, $sw, $sh, [System.Drawing.GraphicsUnit]::Pixel); $g.Dispose(); $o
}
# 1) banner
$bh = [int]($img.Width * 536 / 960)
$ban = Resized $img 960 536 0 $BannerY $img.Width $bh ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$bp = Join-Path $root "images\classes\$Cls.jpg"; Save-Jpeg $ban $bp 86; $ban.Dispose()
"banner $bp  $([Math]::Round((Get-Item $bp).Length / 1KB)) KB"
# 2) hero cut-out
$pr = $Protect -split ',' | ForEach-Object { [int]$_ }; $cut = [ArtCut]::Cut($img, $Chroma, $BlueOverGreen, $pr[0], $pr[1], $pr[2], $pr[3])
$w = [int]($cut.Width * $HeroH / $cut.Height)
$hero = Resized $cut $w $HeroH 0 0 $cut.Width $cut.Height ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$hp = Join-Path $root "images\classes\hero\$Cls.png"; $hero.Save($hp, [System.Drawing.Imaging.ImageFormat]::Png)
"hero $hp  $($hero.Width)x$($hero.Height)  $([Math]::Round((Get-Item $hp).Length / 1KB)) KB"
$hero.Dispose(); $cut.Dispose(); $img.Dispose()
