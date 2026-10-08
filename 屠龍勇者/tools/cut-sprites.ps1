# 屠龍勇者：把 AI 產生的「動作表」切成遊戲用的人物模型圖（ARCHITECTURE.md 第 18 節）
# 用法：powershell -ExecutionPolicy Bypass -File tools\cut-sprites.ps1 -Spec 規格.json -Preview 預覽.png
# 規格 JSON：
# { "sheet": "原圖.jpg", "out": "images/sprites/demon-attack.png", "charH": 113, "pad": 4, "tol": 34,
#   "dirs": { "down": [[x,y,w,h], ...], "right": [...], "up": [...] } }
#   每個 [x,y,w,h] 是原圖上一格的裁切框（依播放順序），列＝方向（down／right／up）
# 做法：每格以裁切框四周的中位數當背景色，從邊緣往內「洪水填滿」相近顏色（不會吃掉角色身上的暗色），
#       邊緣依色差淡出；去掉碰到左右邊的小碎塊（隔壁格伸過來的劍、翅膀）。
#       身高：每格取「腳底」到「身體中線附近最高點」，同一張圖取中位數，縮放成 charH；
#       水平對齊：腳附近非發光像素的中位數。輸出時所有格子同尺寸、腳底貼齊格子底部。
param([string]$Spec, [string]$Preview)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class CutFrame {
    public Bitmap Img;          // 去背後的裁切圖（原圖比例）
    public int Feet;            // 腳底 y（裁切圖座標）
    public int AnchorX;         // 身體中心 x
    public int TopCenter;       // 身體中線附近最高點
}

public static class SpriteCutter {
    static int[] Read(Bitmap b) {
        var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        var a = new int[b.Width * b.Height];
        Marshal.Copy(d.Scan0, a, 0, a.Length); b.UnlockBits(d); return a;
    }
    static Bitmap Write(int[] a, int w, int h) {
        var b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(a, 0, d.Scan0, a.Length); b.UnlockBits(d); return b;
    }
    static int R(int c) { return (c >> 16) & 255; }
    static int G(int c) { return (c >> 8) & 255; }
    static int B(int c) { return c & 255; }
    // 色差：亮度差＋色相差（色相加重 2.5 倍）。背景是藍灰色，盔甲偏紅或接近黑，靠色相分得開
    static double Dist(int c, int r, int g, int b) {
        double dl = (R(c) + G(c) + B(c) - r - g - b) / 3.0;
        double d1 = (R(c) - G(c)) - (r - g), d2 = (B(c) - G(c)) - (b - g);
        return Math.Sqrt(dl * dl + 6.25 * (d1 * d1 + d2 * d2));
    }
    static double Dist2(int c, int o) { return Dist(c, R(o), G(o), B(o)); }
    static bool Glow(int c) { return R(c) > 120 && R(c) > G(c) * 1.6; }

    public static CutFrame Cut(Bitmap sheet, int x0, int y0, int w, int h, double tol) {
        var crop = sheet.Clone(new Rectangle(x0, y0, w, h), PixelFormat.Format32bppArgb);
        var px = Read(crop); crop.Dispose();
        // 背景色：四周（內縮 3px）中位數
        var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
        for (int x = 3; x < w - 3; x += 2) foreach (int y in new[] { 3, h - 4 }) { int c = px[y * w + x]; rs.Add(R(c)); gs.Add(G(c)); bs.Add(B(c)); }
        for (int y = 3; y < h - 3; y += 2) foreach (int x in new[] { 3, w - 4 }) { int c = px[y * w + x]; rs.Add(R(c)); gs.Add(G(c)); bs.Add(B(c)); }
        rs.Sort(); gs.Sort(); bs.Sort();
        int br = rs[rs.Count / 2], bg = gs[gs.Count / 2], bb = bs[bs.Count / 2];
        // 洪水填滿背景：要同時「接近背景色」（tol）且「跟來源鄰點差不多」（step，可以順著漸層走、碰到輪廓就停）
        var isBg = new bool[w * h];
        var q = new Queue<int>();
        double step = tol * 0.45;
        Action<int, int> push = (i, from) => {
            if (isBg[i] || Dist(px[i], br, bg, bb) >= tol) return;
            if (from >= 0 && Dist2(px[i], px[from]) >= step) return;
            isBg[i] = true; q.Enqueue(i);
        };
        for (int x = 0; x < w; x++) { push(x, -1); push((h - 1) * w + x, -1); }
        for (int y = 0; y < h; y++) { push(y * w, -1); push(y * w + w - 1, -1); }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w;
            if (x > 0) push(i - 1, i); if (x < w - 1) push(i + 1, i); if (y > 0) push(i - w, i); if (y < h - 1) push(i + w, i);
        }
        // 離背景幾格（最多算到 4）
        var near = new int[w * h];
        for (int i = 0; i < w * h; i++) { near[i] = isBg[i] ? 0 : 99; if (isBg[i]) q.Enqueue(i); }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w, nd = near[i] + 1;
            if (nd > 4) continue;
            foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                if (j >= 0 && near[j] > nd) { near[j] = nd; q.Enqueue(j); }
        }
        // 透明度：背景 0。靠近背景的「發光／偏紅」像素當成疊在背景上的光（依色差給半透明，並把背景色扣掉還原顏色），
        // 暗色盔甲只淡化最外一圈；離裁切框邊 14px 內逐漸淡出（光暈被格子切斷時不會出現方形硬邊）
        var alpha = new byte[w * h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int i = y * w + x;
            if (isBg[i]) continue;
            int c = px[i];
            double d = Dist(c, br, bg, bb), a = 1;
            bool reddish = R(c) - G(c) > 12;
            if (near[i] <= 4 && reddish) {
                a = Math.Min(1, d / 110);
                if (a > 0.02) {
                    int nr = (int)Math.Max(0, Math.Min(255, br + (R(c) - br) / a));
                    int ng = (int)Math.Max(0, Math.Min(255, bg + (G(c) - bg) / a));
                    int nb = (int)Math.Max(0, Math.Min(255, bb + (B(c) - bb) / a));
                    px[i] = (nr << 16) | (ng << 8) | nb;
                }
            } else if (near[i] == 1) a = Math.Max(0, Math.Min(1, (d - tol * 0.3) / tol));
            double e = Math.Min(Math.Min(x, w - 1 - x), Math.Min(y, h - 1 - y));
            if (e < 14) a *= e / 14.0;
            alpha[i] = (byte)Math.Round(a * 255);
        }
        // 連通塊：保留最大塊；碰到左右邊且不大的塊（隔壁格伸過來）、太小的碎點都去掉
        var comp = new int[w * h]; for (int i = 0; i < comp.Length; i++) comp[i] = -1;
        var sizes = new List<int>(); var touch = new List<bool>();
        for (int s = 0; s < w * h; s++) {
            if (alpha[s] == 0 || comp[s] >= 0) continue;
            int id = sizes.Count, n = 0; bool t = false;
            comp[s] = id; q.Enqueue(s);
            while (q.Count > 0) {
                int i = q.Dequeue(), x = i % w, y = i / w; n++;
                if (x <= 15 || x >= w - 16) t = true;   // 邊緣 14px 已淡出，碰到這一帶就算「從隔壁伸過來」
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
                    int nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    int j = ny * w + nx; if (alpha[j] > 0 && comp[j] < 0) { comp[j] = id; q.Enqueue(j); }
                }
            }
            sizes.Add(n); touch.Add(t);
        }
        int main = 0; for (int i = 1; i < sizes.Count; i++) if (sizes[i] > sizes[main]) main = i;
        int big = sizes.Count > 0 ? sizes[main] : 0;
        var outPx = new int[w * h];
        for (int i = 0; i < w * h; i++) {
            if (alpha[i] == 0) continue;
            int c = comp[i];
            bool keep = c == main || (sizes[c] > big * 0.008 && !(touch[c] && sizes[c] < big * 0.25));
            if (keep) outPx[i] = (alpha[i] << 24) | (px[i] & 0xFFFFFF);
        }
        var f = new CutFrame();
        // 腳底：最大塊最下面、該列至少 3 個不透明點
        f.Feet = h - 1;
        for (int y = h - 1; y >= 0; y--) { int n = 0; for (int x = 0; x < w; x++) if (comp[y * w + x] == main && alpha[y * w + x] > 128) n++; if (n >= 3) { f.Feet = y; break; } }
        // 先粗估身體中心（最大塊的 x 中位數），再用腳附近非發光像素修正
        var xs = new List<int>();
        for (int i = 0; i < w * h; i++) if (comp[i] == main && alpha[i] > 128 && !Glow(px[i])) xs.Add(i % w);
        xs.Sort(); int cx = xs.Count > 0 ? xs[xs.Count / 2] : w / 2;
        // 中線最高點：中心 ±band 內最高的不透明點（避開兩側翅膀）
        int band = Math.Max(6, w / 30);
        f.TopCenter = f.Feet;
        for (int y = 0; y < f.Feet; y++) { bool hit = false; for (int x = Math.Max(0, cx - band); x <= Math.Min(w - 1, cx + band); x++) if (comp[y * w + x] == main && alpha[y * w + x] > 128 && !Glow(px[y * w + x])) { hit = true; break; } if (hit) { f.TopCenter = y; break; } }
        int bodyH = Math.Max(10, f.Feet - f.TopCenter);
        // 水平基準＝頭部中心：中線最高點往下 10% 身高、左右 ±12% 身高內的像素中位數（重複兩次讓中線收斂到頭上）
        int hx = cx;
        for (int pass = 0; pass < 2; pass++) {
            xs.Clear();
            int half = bodyH * 12 / 100;
            for (int y = f.TopCenter; y <= Math.Min(h - 1, f.TopCenter + bodyH / 10); y++)
                for (int x = Math.Max(0, hx - half); x <= Math.Min(w - 1, hx + half); x++) { int i = y * w + x; if (comp[i] == main && alpha[i] > 128 && !Glow(px[i])) xs.Add(x); }
            if (xs.Count == 0) break;
            xs.Sort(); hx = xs[xs.Count / 2];
        }
        f.AnchorX = hx;
        f.Img = Write(outPx, w, h);
        return f;
    }
}
"@

$cfg = Get-Content $Spec -Raw -Encoding UTF8 | ConvertFrom-Json
$root = Split-Path (Split-Path (Resolve-Path $MyInvocation.MyCommand.Path).Path -Parent) -Parent   # 屠龍勇者/
$sheetPath = if ([IO.Path]::IsPathRooted($cfg.sheet)) { $cfg.sheet } else { Join-Path $root $cfg.sheet }
if (-not (Test-Path $sheetPath)) { throw "找不到原圖：$sheetPath" }
$sheet = New-Object System.Drawing.Bitmap $sheetPath
$tol = if ($cfg.tol) { [double]$cfg.tol } else { 34 }
$pad = if ($cfg.pad) { [int]$cfg.pad } else { 4 }
$dirs = 'down', 'right', 'up'
$frames = @{}
$heights = @()
foreach ($d in $dirs) {
    $frames[$d] = @()
    foreach ($r in $cfg.dirs.$d) {
        $f = [SpriteCutter]::Cut($sheet, [int]$r[0], [int]$r[1], [int]$r[2], [int]$r[3], $tol)
        $frames[$d] += $f
        if ($d -ne 'up') { $heights += ($f.Feet - $f.TopCenter) }   # 背面看不到頭頂角，身高只用正面與側面量
    }
}
$sorted = $heights | Sort-Object
$bodyH = if ($cfg.bodyH) { [double]$cfg.bodyH } else { $sorted[[int]($sorted.Count / 2)] }
$k = [double]$cfg.charH / $bodyH
# 輸出格子大小：所有格縮放後，以身體中心為準左右取最大、腳底以上取最高
$left = 0; $right = 0; $top = 0
foreach ($d in $dirs) { foreach ($f in $frames[$d]) {
    # 實際有內容的範圍
    $bb = $f.Img; $minX = $bb.Width; $maxX = 0; $minY = $bb.Height
    $data = $bb.LockBits((New-Object System.Drawing.Rectangle 0, 0, $bb.Width, $bb.Height), 'ReadOnly', 'Format32bppArgb')
    $arr = New-Object int[] ($bb.Width * $bb.Height); [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $arr, 0, $arr.Length); $bb.UnlockBits($data)
    for ($y = 0; $y -lt $bb.Height; $y += 2) { for ($x = 0; $x -lt $bb.Width; $x += 2) { if ((($arr[$y * $bb.Width + $x] -shr 24) -band 255) -gt 20) { if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }; if ($y -lt $minY) { $minY = $y } } } }
    $left = [Math]::Max($left, ($f.AnchorX - $minX) * $k); $right = [Math]::Max($right, ($maxX - $f.AnchorX) * $k); $top = [Math]::Max($top, ($f.Feet - $minY) * $k)
} }
$half = [int][Math]::Ceiling([Math]::Max($left, $right)) + $pad
$cellW = $half * 2; $cellH = [int][Math]::Ceiling($top) + $pad
$cols = ($dirs | ForEach-Object { $frames[$_].Count } | Measure-Object -Maximum).Maximum
$out = New-Object System.Drawing.Bitmap ($cellW * $cols), ($cellH * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
for ($row = 0; $row -lt 3; $row++) {
    $list = $frames[$dirs[$row]]
    for ($i = 0; $i -lt $list.Count; $i++) {
        $f = $list[$i]
        $dw = $f.Img.Width * $k; $dh = $f.Img.Height * $k
        $dx = $i * $cellW + $half - $f.AnchorX * $k
        $dy = $row * $cellH + $cellH - $f.Feet * $k
        $g.SetClip((New-Object System.Drawing.Rectangle ($i * $cellW), ($row * $cellH), $cellW, $cellH))
        $g.DrawImage($f.Img, [single]$dx, [single]$dy, [single]$dw, [single]$dh)
        $g.ResetClip()
    }
}
$g.Dispose()
$outPath = Join-Path $root $cfg.out
$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
"{0}: cellW {1} cellH {2}  frames down {3} right {4} up {5}  bodyH {6} scale {7:N3}  {8} KB" -f $cfg.out, $cellW, $cellH, $frames.down.Count, $frames.right.Count, $frames.up.Count, $bodyH, $k, [int]((Get-Item $outPath).Length / 1024)

# 預覽：放大 2 倍、藍灰底、每格畫腳底線
if ($Preview) {
    $pv = New-Object System.Drawing.Bitmap ($out.Width * 2), ($out.Height * 2)
    $gp = [System.Drawing.Graphics]::FromImage($pv)
    $gp.Clear([System.Drawing.Color]::FromArgb(70, 95, 70))
    $gp.DrawImage($out, 0, 0, $out.Width * 2, $out.Height * 2)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 255, 255, 0)), 1
    for ($row = 0; $row -lt 3; $row++) { for ($i = 0; $i -lt $cols; $i++) { $gp.DrawRectangle($pen, $i * $cellW * 2, $row * $cellH * 2, $cellW * 2 - 1, $cellH * 2 - 1) } }
    $pv.Save($Preview, [System.Drawing.Imaging.ImageFormat]::Png)
    $gp.Dispose(); $pv.Dispose()
}
foreach ($d in $dirs) { foreach ($f in $frames[$d]) { $f.Img.Dispose() } }
$out.Dispose(); $sheet.Dispose()
