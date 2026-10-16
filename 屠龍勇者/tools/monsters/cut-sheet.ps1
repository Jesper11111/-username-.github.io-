# Cut monster action sheets into game sprite strips (Windows version of cut2.py; no Python needed).
# Spec: specH.json -> { id: { src, scale, walk: { y: [[y0,y1]...], x: [[front lines], [side lines], [back lines]] }, attack: {...} } }
#   Each y range x each pair of neighbouring x lines = one frame; frames play left-to-right, row by row.
#   Side frames must face RIGHT (add "flipSide": true if the sheet faces left).
# Output: images/monsters/<id>.png (6 rows = walk front/side/back, attack front/side/back) + prints the MON_SPRITES line.
# Run from 屠龍勇者: powershell -ExecutionPolicy Bypass -File tools\monsters\cut-sheet.ps1 [-Spec specH.json] [-Only antharas]
param([string]$Spec = 'specH.json', [string]$Only = '')
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path (Split-Path -Parent (Split-Path -Parent $dir)) 'images\monsters'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class MonCut {
    // returns a tightly cropped RGBA bitmap of the main body inside box (x0,y0,x1,y1), or null
    public static Bitmap Cut(Bitmap sheet, int x0, int y0, int x1, int y1, bool flip) {
        int W = x1 - x0, H = y1 - y0;
        var src = sheet.Clone(new Rectangle(x0, y0, W, H), PixelFormat.Format24bppRgb);
        var d = src.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        int st = d.Stride; var a = new byte[st * H]; Marshal.Copy(d.Scan0, a, 0, a.Length); src.UnlockBits(d); src.Dispose();
        Func<int, int, int> mn = (x, y) => { int i = y * st + x * 3; return Math.Min(a[i], Math.Min(a[i + 1], a[i + 2])); };
        Func<int, int, int> mx = (x, y) => { int i = y * st + x * 3; return Math.Max(a[i], Math.Max(a[i + 1], a[i + 2])); };
        // background = white, plus the soft grey drop shadow (neutral light grey), flood-filled from the cell border
        Func<int, int, bool> bgLike = (x, y) => { int m = mn(x, y), s = mx(x, y) - m; return (m >= 222 && s <= 22) || (m >= 168 && s <= 14); };
        var bg = new bool[W * H]; var q = new Queue<int>();
        Action<int, int> seed = (x, y) => { int k = y * W + x; if (!bg[k] && bgLike(x, y)) { bg[k] = true; q.Enqueue(k); } };
        for (int x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
        for (int y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
        while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
            if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1); }
        // keep only the main body: biggest 8-connected blob + blobs >= 15% of it
        var lbl = new int[W * H]; var areas = new List<int> { 0 };
        for (int k0 = 0; k0 < W * H; k0++) { if (bg[k0] || lbl[k0] != 0) continue;
            int id = areas.Count, n = 0; lbl[k0] = id; q.Enqueue(k0);
            while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W; n++;
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) { int xx = x + dx, yy = y + dy;
                    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; int kk = yy * W + xx;
                    if (!bg[kk] && lbl[kk] == 0) { lbl[kk] = id; q.Enqueue(kk); } } }
            areas.Add(n); }
        if (areas.Count <= 1) return null;
        int big = 0; for (int i = 1; i < areas.Count; i++) big = Math.Max(big, areas[i]);
        for (int k = 0; k < W * H; k++) if (!bg[k] && areas[lbl[k]] < big * 0.15) bg[k] = true;
        // RGBA with a soft 1px edge next to the background
        var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        var od = o.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var ob = new byte[od.Stride * H]; int minX = W, minY = H, maxX = -1, maxY = -1;
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
            int k = y * W + x; if (bg[k]) continue; int i = y * st + x * 3;
            bool edge = (x > 0 && bg[k - 1]) || (x < W - 1 && bg[k + 1]) || (y > 0 && bg[k - W]) || (y < H - 1 && bg[k + W]);
            int alpha = 255; if (edge) { double lum = (a[i] + a[i + 1] + a[i + 2]) / 3.0; alpha = (int)Math.Max(0, Math.Min(255, (255 - lum) * 255 / 70)); }
            int tx = flip ? W - 1 - x : x, j = y * od.Stride + tx * 4;
            ob[j] = a[i]; ob[j + 1] = a[i + 1]; ob[j + 2] = a[i + 2]; ob[j + 3] = (byte)alpha;
            if (alpha > 0) { minX = Math.Min(minX, tx); maxX = Math.Max(maxX, tx); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y); } }
        Marshal.Copy(ob, 0, od.Scan0, ob.Length); o.UnlockBits(od);
        if (maxX < 0) { o.Dispose(); return null; }
        var c = o.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb); o.Dispose();
        return c;
    }
}
'@
$specs = Get-Content (Join-Path $dir $Spec) -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($p in $specs.PSObject.Properties) {
    $id = $p.Name; $s = $p.Value
    if ($Only -and $Only -ne $id) { continue }
    $sheet = [System.Drawing.Bitmap]::FromFile((Join-Path $dir $s.src))
    $scale = if ($s.scale) { [double]$s.scale } else { 1.0 }
    $rows = @()
    foreach ($anim in 'walk', 'attack') {
        $g = $s.$anim
        for ($d = 0; $d -lt 3; $d++) {
            $xs = $g.x[$d]; $fr = New-Object System.Collections.ArrayList
            foreach ($yr in $g.y) { for ($c = 0; $c -lt $xs.Count - 1; $c++) {
                $flip = ($d -eq 1 -and $s.flipSide)
                $im = [MonCut]::Cut($sheet, [int]$xs[$c] + 4, [int]$yr[0] + 4, [int]$xs[$c + 1] - 4, [int]$yr[1] - 4, [bool]$flip)
                if ($im) { [void]$fr.Add($im) } } }
            $rows += ,$fr
        }
    }
    $sheet.Dispose()
    $cw = 0; $ch = 0
    foreach ($r in $rows) { foreach ($im in $r) { $cw = [Math]::Max($cw, $im.Width); $ch = [Math]::Max($ch, $im.Height) } }
    $cw = [int][Math]::Ceiling($cw * $scale) + 4; $ch = [int][Math]::Ceiling($ch * $scale) + 4
    $cols = ($rows | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
    $out = New-Object System.Drawing.Bitmap ($cw * $cols), ($ch * 6), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($out)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    for ($ri = 0; $ri -lt 6; $ri++) { $r = $rows[$ri]; for ($ci = 0; $ci -lt $r.Count; $ci++) {
        $im = $r[$ci]; $w = [int][Math]::Round($im.Width * $scale); $h = [int][Math]::Round($im.Height * $scale)
        $gr.DrawImage($im, ($ci * $cw + [int](($cw - $w) / 2)), ($ri * $ch + $ch - 2 - $h), $w, $h) } }   # feet aligned to cell bottom
    $gr.Dispose()
    $dst = Join-Path $outDir "$id.png"; $out.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png); $out.Dispose()
    $body = [int][Math]::Round($rows[0][0].Height * $scale)
    foreach ($r in $rows) { foreach ($im in $r) { $im.Dispose() } }
    $n = ($rows | ForEach-Object { $_.Count }) -join ', '
    "$id`: { cw: $cw, ch: $ch, body: $body, n: [$n] },   // $([Math]::Round((Get-Item $dst).Length / 1KB)) KB"
}
