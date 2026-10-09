# 屠龍勇者：把 AI 產生的「動作表」切成遊戲用的人物模型圖（ARCHITECTURE.md 第 18 節）
# 用法：powershell -ExecutionPolicy Bypass -File tools\cut-sprites.ps1 -Spec 規格.json -Preview 預覽.png
# 規格 JSON：
# { "sheet": "原圖.jpg", "out": "images/sprites/demon-attack.png", "charH": 113, "pad": 4, "tol": 34, "bg": "checker"（可省略）, "global": true（可省略）,
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
    // dropEdge：碰到左右邊、且小於主體這個比例的塊去掉（預設 0.25）；darkBg：global 模式下平均亮度低於此值的暗灰一律當背景（預設 22）
    public static double DropEdge = 0.25;
    public static int DarkBg = 22;
    // checker2：格紋每格大小（px），> 0 時格紋模式改用「交替」判斷
    public static int CheckerSize = 0;
    // checker2 的陰影修正（被壓暗的格紋當背景）；規格裡裁切框第 5 個數字填 0 可以對單一格關掉
    public static bool ShadowFix = true;
    public static int ShapeN = 0;
    // flat：背景是單一純色灰（妖精）——接近背景色又是中性灰的點一律當背景（被弓弦、手臂圍住的背景、地面陰影都去掉）
    public static bool Flat = false;
    // labels：格子右下角有金色編號數字（AI 動作表常見）——裁切框右下 50×34 內的金色點先塗成背景色
    public static bool Labels = false;
    // shadowLeft：3D 渲染的長影子往左拖在地上（修羅）——下方 40%、頭部（紅髮）中心左邊 20px 以外，暗於背景的中性灰一律當背景
    public static bool ShadowLeft = false;
    // sharpen：輸出圖（已縮放）做反銳利化遮罩，amount 約 0.6～1.2（原圖人物太小被放大時用，修羅）
    // trim：再從透明處往內吃掉 N 圈「暗、偏中性、接近背景」的邊緣點（形狀去背殘留的暗色雜邊）
    public static void PostProcess(Bitmap b, double amount, int trim, int bgLum) {
        int w = b.Width, h = b.Height;
        var px = Read(b);
        for (int pass = 0; pass < trim; pass++) {
            var kill = new List<int>();
            for (int y = 1; y < h - 1; y++) for (int x = 1; x < w - 1; x++) {
                int i = y * w + x, c = px[i];
                if (((c >> 24) & 255) == 0) continue;
                bool edge = false;
                foreach (int j in new[] { i - 1, i + 1, i - w, i + w }) if (((px[j] >> 24) & 255) < 40) { edge = true; break; }
                if (!edge) continue;
                int lum = (R(c) + G(c) + B(c)) / 3, mx = Math.Max(R(c), Math.Max(G(c), B(c))), mn = Math.Min(R(c), Math.Min(G(c), B(c)));
                if (lum < bgLum + 18 && mx - mn < 22) kill.Add(i);
            }
            foreach (int i in kill) px[i] = 0;
        }
        if (amount > 0) {
            var o = (int[])px.Clone();
            for (int y = 1; y < h - 1; y++) for (int x = 1; x < w - 1; x++) {
                int i = y * w + x, c = px[i], a = (c >> 24) & 255;
                if (a == 0) continue;
                double sr = 0, sg = 0, sb = 0, sw = 0;
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
                    int j = i + dy * w + dx, cj = px[j], aj = (cj >> 24) & 255;
                    if (aj == 0) continue;
                    double k = (dx == 0 && dy == 0 ? 4 : (dx == 0 || dy == 0 ? 2 : 1)) * aj / 255.0;
                    sr += R(cj) * k; sg += G(cj) * k; sb += B(cj) * k; sw += k;
                }
                if (sw <= 0) continue;
                int nr = (int)Math.Max(0, Math.Min(255, R(c) + amount * (R(c) - sr / sw)));
                int ng = (int)Math.Max(0, Math.Min(255, G(c) + amount * (G(c) - sg / sw)));
                int nb = (int)Math.Max(0, Math.Min(255, B(c) + amount * (B(c) - sb / sw)));
                o[i] = (a << 24) | (nr << 16) | (ng << 8) | nb;
            }
            px = o;
        }
        var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(px, 0, d.Scan0, px.Length); b.UnlockBits(d);
    }
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

    // checker：背景是「畫出來的」灰白格紋（假透明）——亮且接近中性灰的像素都算背景（不用洪水填滿，角色身上的空隙也會去掉）
    // 膨脹：離任一 true 點 r 以內（棋盤距離）的點都設成 true
    static bool[] Grow(bool[] src, int w, int h, int r) {
        var dist = new int[w * h]; var q = new Queue<int>();
        for (int i = 0; i < w * h; i++) { dist[i] = src[i] ? 0 : int.MaxValue; if (src[i]) q.Enqueue(i); }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w, nd = dist[i] + 1;
            if (nd > r) continue;
            for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
                int nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                int j = ny * w + nx; if (dist[j] > nd) { dist[j] = nd; q.Enqueue(j); }
            }
        }
        var o = new bool[w * h]; for (int i = 0; i < w * h; i++) o[i] = dist[i] <= r; return o;
    }

    // matte：深色漸層底＋深色角色（修羅）——每一列用整列像素的中位數當該列背景色，
    // 依色差給柔和透明度（< lo 透明、> hi 不透明），再從邊緣往內填「透明度 < 一半」的點，被輪廓包住的內部一律不透明（盔甲不會破洞）
    public static bool Matte = false;
    static CutFrame CutMatte(Bitmap sheet, int x0, int y0, int w, int h, double lo, double hi) {
        var crop = sheet.Clone(new Rectangle(x0, y0, w, h), PixelFormat.Format32bppArgb);
        var px = Read(crop); crop.Dispose();
        var rowBg = new int[h * 3];
        for (int y = 0; y < h; y++) {
            var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
            // 整列（上下各 2 列）的中位數：人物＋影子佔不到一半寬，中位數就是背景
            for (int yy = Math.Max(0, y - 2); yy <= Math.Min(h - 1, y + 2); yy++)
                for (int x = 0; x < w; x += 2) { int c = px[yy * w + x]; rs.Add(R(c)); gs.Add(G(c)); bs.Add(B(c)); }
            rs.Sort(); gs.Sort(); bs.Sort();
            rowBg[y * 3] = rs[rs.Count / 2]; rowBg[y * 3 + 1] = gs[gs.Count / 2]; rowBg[y * 3 + 2] = bs[bs.Count / 2];
        }
        var af = new double[w * h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int i = y * w + x;
            double d = Dist(px[i], rowBg[y * 3], rowBg[y * 3 + 1], rowBg[y * 3 + 2]);
            af[i] = Math.Max(0, Math.Min(1, (d - lo) / (hi - lo)));
        }
        // 長影子：比背景暗的中性灰（同 shadowLeft 規則）透明度歸零
        if (ShadowLeft) {
            var isBg = new bool[w * h];
            ShadowRules(px, isBg, w, h, (rowBg[(h / 2) * 3] + rowBg[(h / 2) * 3 + 1] + rowBg[(h / 2) * 3 + 2]) / 3);
            for (int i = 0; i < w * h; i++) if (isBg[i]) af[i] = 0;
        }
        // 從邊緣往內填 af < 0.5 的點＝外部；其餘（輪廓內）不透明
        var outside = new bool[w * h]; var q = new Queue<int>();
        for (int x = 0; x < w; x++) foreach (int i in new[] { x, (h - 1) * w + x }) if (af[i] < 0.5 && !outside[i]) { outside[i] = true; q.Enqueue(i); }
        for (int y = 0; y < h; y++) foreach (int i in new[] { y * w, y * w + w - 1 }) if (af[i] < 0.5 && !outside[i]) { outside[i] = true; q.Enqueue(i); }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w;
            foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                if (j >= 0 && !outside[j] && af[j] < 0.5) { outside[j] = true; q.Enqueue(j); }
        }
        var alpha = new byte[w * h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int i = y * w + x;
            double a = outside[i] ? af[i] : 1;
            // 半透明的邊緣點：扣掉背景色還原顏色，避免灰邊
            if (a > 0.02 && a < 1) {
                int br = rowBg[y * 3], bg = rowBg[y * 3 + 1], bb = rowBg[y * 3 + 2], c = px[i];
                int nr = (int)Math.Max(0, Math.Min(255, br + (R(c) - br) / a));
                int ng = (int)Math.Max(0, Math.Min(255, bg + (G(c) - bg) / a));
                int nb = (int)Math.Max(0, Math.Min(255, bb + (B(c) - bb) / a));
                px[i] = (nr << 16) | (ng << 8) | nb;
            }
            double e = Math.Min(Math.Min(x, w - 1 - x), Math.Min(y, h - 1 - y));
            if (e < 6) a *= e / 6.0;
            alpha[i] = (byte)Math.Round(a * 255);
        }
        return Finish(px, alpha, w, h);
    }

    // shadowLeft 的兩條規則（Cut 與 CutMatte 共用）
    static void ShadowRules(int[] px, bool[] isBg, int w, int h, int bgL) {
        var hx = new List<int>();
        for (int y = 0; y < h * 3 / 10; y++) for (int x = 0; x < w; x++) { int c = px[y * w + x]; if (R(c) - G(c) > 45) hx.Add(x); }
        if (hx.Count == 0) return;
        hx.Sort(); int headX = hx[hx.Count / 2];
        for (int y = h * 6 / 10; y < h; y++) for (int x = 0; x < headX - 20; x++) {
            int c = px[y * w + x], mx = Math.Max(R(c), Math.Max(G(c), B(c))), mn = Math.Min(R(c), Math.Min(G(c), B(c)));
            if ((R(c) + G(c) + B(c)) / 3 < bgL + 4 && mx - mn < 14) isBg[y * w + x] = true;
        }
        // 腳邊與刀下的殘影：下方 45%、整個寬度，暗、中性灰又平滑（周圍 2px 色差小；盔甲有紋理不算）
        for (int y = h * 55 / 100; y < h; y++) for (int x = 0; x < w; x++) {
            int i = y * w + x, c = px[i], mx = Math.Max(R(c), Math.Max(G(c), B(c))), mn = Math.Min(R(c), Math.Min(G(c), B(c)));
            if ((R(c) + G(c) + B(c)) / 3 >= bgL + 4 || mx - mn >= 14) continue;
            int gmax = 0;
            foreach (int j in new[] { x > 1 ? i - 2 : i, x < w - 2 ? i + 2 : i, y > 1 ? i - 2 * w : i, y < h - 2 ? i + 2 * w : i }) {
                int o = px[j]; gmax = Math.Max(gmax, Math.Abs(R(o) - R(c)) + Math.Abs(G(o) - G(c)) + Math.Abs(B(o) - B(c)));
            }
            if (gmax < 16) isBg[i] = true;
        }
    }

    public static CutFrame Cut(Bitmap sheet, int x0, int y0, int w, int h, double tol, bool checker, bool global, int shape) {
        if (checker) return CutChecker(sheet, x0, y0, w, h);
        if (Matte) return CutMatte(sheet, x0, y0, w, h, tol * 0.35, tol);
        var crop = sheet.Clone(new Rectangle(x0, y0, w, h), PixelFormat.Format32bppArgb);
        var px = Read(crop); crop.Dispose();
        // 背景色：四周（內縮 3px）中位數
        var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
        for (int x = 3; x < w - 3; x += 2) foreach (int y in new[] { 3, h - 4 }) { int c = px[y * w + x]; rs.Add(R(c)); gs.Add(G(c)); bs.Add(B(c)); }
        for (int y = 3; y < h - 3; y += 2) foreach (int x in new[] { 3, w - 4 }) { int c = px[y * w + x]; rs.Add(R(c)); gs.Add(G(c)); bs.Add(B(c)); }
        rs.Sort(); gs.Sort(); bs.Sort();
        int br = rs[rs.Count / 2], bg = gs[gs.Count / 2], bb = bs[bs.Count / 2];
        var isBg = new bool[w * h];
        var q = new Queue<int>();
        if (Labels) {
            // 金色數字（偏黃、亮）＋外圍 3px（字的暗色描邊）塗成背景色
            var lab = new bool[w * h];
            for (int y = Math.Max(0, h - 34); y < h; y++) for (int x = Math.Max(0, w - 50); x < w; x++) {
                int c = px[y * w + x];
                if (R(c) > 150 && G(c) > 110 && R(c) - B(c) > 60) lab[y * w + x] = true;
            }
            var labG = Grow(lab, w, h, 3);
            int bgc = (255 << 24) | (br << 16) | (bg << 8) | bb;
            for (int i = 0; i < w * h; i++) if (labG[i] && (i % w) >= w - 53 && (i / w) >= h - 37) px[i] = bgc;
        }
        if (shape > 0) {
            // shape：角色有一大片和背景同色（黑衣、黑髮），顏色分不開——改用形狀：
            // 和背景明顯不同的點（輪廓線、皺褶、裝備）＝「確定是角色」，膨脹 shape px 再侵蝕回來（把相鄰細節連成輪廓），
            // 從邊緣往內填「輪廓外」的點當背景；被輪廓包住的同色區域就留下來
            var strong = new bool[w * h];
            int bgLum = (br + bg + bb) / 3;
            for (int i = 0; i < w * h; i++) {
                int c = px[i];
                if (Dist(c, br, bg, bb) < tol) continue;
                // 地面陰影：比背景暗、色相和背景一樣、又平滑 → 不算角色細節（輪廓線那種明顯邊緣才算）
                double d1 = (R(c) - G(c)) - (br - bg), d2 = (B(c) - G(c)) - (bb - bg);
                bool darkSame = (R(c) + G(c) + B(c)) / 3 < bgLum && Math.Abs(d1) < 6 && Math.Abs(d2) < 6;
                if (darkSame) {
                    int x = i % w, y = i / w, gmax = 0;
                    foreach (int j in new[] { x > 1 ? i - 2 : i, x < w - 2 ? i + 2 : i, y > 1 ? i - 2 * w : i, y < h - 2 ? i + 2 * w : i }) {
                        int o = px[j]; gmax = Math.Max(gmax, Math.Abs(R(o) - R(c)) + Math.Abs(G(o) - G(c)) + Math.Abs(B(o) - B(c)));
                    }
                    if (gmax < 18) continue;
                }
                strong[i] = true;
            }
            var dil = Grow(strong, w, h, shape);
            var inv = new bool[w * h]; for (int i = 0; i < w * h; i++) inv[i] = !dil[i];
            var ero = Grow(inv, w, h, shape);   // 侵蝕＝反相後膨脹
            for (int i = 0; i < w * h; i++) {
                bool solid = !ero[i] || strong[i];
                if (solid) continue;
                int x = i % w, y = i / w;
                if ((x == 0 || y == 0 || x == w - 1 || y == h - 1) && !isBg[i]) { isBg[i] = true; q.Enqueue(i); }
            }
            while (q.Count > 0) {
                int i = q.Dequeue(), x = i % w, y = i / w;
                foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                    if (j >= 0 && !isBg[j] && ero[j] && !strong[j]) { isBg[j] = true; q.Enqueue(j); }
            }
            // 輪廓修邊：膨脹再侵蝕會在凹處留下背景色的階梯方塊——從背景往內再吃「非細節點」，最多 shape px 深
            var depth = new int[w * h];
            for (int i = 0; i < w * h; i++) if (isBg[i]) q.Enqueue(i);
            while (q.Count > 0) {
                int i = q.Dequeue(), x = i % w, y = i / w;
                if (depth[i] >= shape) continue;
                foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                    if (j >= 0 && !isBg[j] && !strong[j]) { isBg[j] = true; depth[j] = depth[i] + 1; q.Enqueue(j); }
            }
            // 法術周圍的深色煙霧：平滑（周圍 2px 色差小）又不太亮的點，從背景往內吃，碰到輪廓線（不平滑）就停，最多 4×shape 深
            var smooth = new bool[w * h];
            for (int i = 0; i < w * h; i++) {
                int x = i % w, y = i / w, c = px[i], gmax = 0;
                if ((R(c) + G(c) + B(c)) / 3 > bgLum + 25) continue;
                foreach (int j in new[] { x > 1 ? i - 2 : i, x < w - 2 ? i + 2 : i, y > 1 ? i - 2 * w : i, y < h - 2 ? i + 2 * w : i }) {
                    int o = px[j]; gmax = Math.Max(gmax, Math.Abs(R(o) - R(c)) + Math.Abs(G(o) - G(c)) + Math.Abs(B(o) - B(c)));
                }
                smooth[i] = gmax < 12;
            }
            for (int i = 0; i < w * h; i++) { depth[i] = 0; if (isBg[i]) q.Enqueue(i); }
            while (q.Count > 0) {
                int i = q.Dequeue(), x = i % w, y = i / w;
                if (depth[i] >= shape * 4) continue;
                foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                    if (j >= 0 && !isBg[j] && smooth[j]) { isBg[j] = true; depth[j] = depth[i] + 1; q.Enqueue(j); }
            }
        } else {
        // 洪水填滿背景：要同時「接近背景色」（tol）且「跟來源鄰點差不多」（step，可以順著漸層走、碰到輪廓就停）
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
        }
        if (ShadowLeft) ShadowRules(px, isBg, w, h, (br + bg + bb) / 3);
        if (Flat) {
            for (int i = 0; i < w * h; i++) {
                int c = px[i], mx = Math.Max(R(c), Math.Max(G(c), B(c))), mn = Math.Min(R(c), Math.Min(G(c), B(c)));
                if (mx - mn < 12 && Dist(c, br, bg, bb) < tol) isBg[i] = true;
            }
        }
        // global：角色與背景色差很大時（例如天使白金 vs 深藍底），「暗且偏藍」的像素一律當背景——
        // 被翅膀、格子邊圍住（洪水進不去）的背景、上亮下暗的漸層底、光暈外圍的暗邊都會去掉
        if (global) {
            for (int i = 0; i < w * h; i++) {
                int c = px[i], lum = (R(c) + G(c) + B(c)) / 3;
                if ((lum < 75 && B(c) - R(c) > 8) || lum < DarkBg) isBg[i] = true;
            }
        }
        // 離背景幾格（最多算到 4；global 算到 16）
        int nearMax = global ? 16 : 4;
        var near = new int[w * h];
        for (int i = 0; i < w * h; i++) { near[i] = isBg[i] ? 0 : 99; if (isBg[i]) q.Enqueue(i); }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w, nd = near[i] + 1;
            if (nd > nearMax) continue;
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
            // 偏紅，或比背景亮（金色光環、光暈）都當成疊在背景上的光
            bool reddish = R(c) - G(c) > 12 || (R(c) + G(c) + B(c)) - (br + bg + bb) > 24;
            // global：離背景 16px 內、暗（平均 < 110）的暖色像素也當光暈（金光淡出到深藍底時混出的暗褐邊）
            if (global && near[i] <= 16 && (R(c) + G(c) + B(c)) / 3 < 110 && R(c) + G(c) > B(c) * 2) reddish = true;
            if (near[i] <= (global ? 16 : 4) && reddish) {
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
        return Finish(px, alpha, w, h);
    }

    // checker2：以「方格」為單位判斷格紋（角色本身也有白色時用，例如聖騎士白披風）
    // 1) 從亮度的左右／上下變化找出格紋週期與起點（週期在 CheckerSize ±0.6 內搜尋）
    // 2) 每格算中性灰像素的亮度中位數與均勻度；均勻、且至少一個相鄰格也均勻而亮度差 > 25（一亮一暗交替）→ 背景格
    //    白披風的相鄰格也是白的，不會交替，所以保留
    // 3) 背景格內、亮度接近該格中位數的中性灰像素＝背景；碰到角色的邊緣格，用斜對角同色背景格的亮度判斷
    // checker2：角色本身也有白色時（聖騎士白披風），格紋的灰白和披風分不開——改用形狀：
    // 1) 有顏色、或比較暗（平均 < 120）的像素＝角色細節（金邊、盔甲、輪廓線）；格紋與披風都是中性亮灰白，不算
    // 2) 細節膨脹 N 再侵蝕回來連成輪廓，從裁切框邊緣往內填「輪廓外」＝背景；再從背景往內吃非細節點最多 N px（修掉輪廓外殘留的方格）
    // 3) 被輪廓包住的區域：同時有兩種格紋亮度（各佔 2 成以上）＝露出來的格紋，也當背景；只有一種亮度（披風）就留著
    static void CheckerCells(int[] px, bool[] isBg, int w, int h, Func<int, int> lumOf, Func<int, bool> neutral) {
        int N = ShapeN > 0 ? ShapeN : Math.Max(3, CheckerSize / 3);   // 輪廓連接半徑（格子很大時用 "shape" 指定）
        var strong = new bool[w * h];
        int S = CheckerSize;
        // 週期交替：左右或上下「隔 1 格亮度差 > 12、隔 2 格亮度差 < 10」（只有格紋有這種規律，披風的明暗沒有）
        Func<int, bool> periodic = i => {
            int x = i % w, y = i / w, l = lumOf(px[i]);
            Func<int, int, bool> ok = (dx, dy) => {
                int x1 = x + dx, y1 = y + dy, x2 = x + 2 * dx, y2 = y + 2 * dy;
                if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) return false;
                int a = px[y1 * w + x1], b = px[y2 * w + x2];
                return neutral(a) && neutral(b) && Math.Abs(lumOf(a) - l) > 12 && Math.Abs(lumOf(b) - l) < 10;
            };
            return ok(S, 0) || ok(-S, 0) || ok(0, S) || ok(0, -S);
        };
        // 被陰影壓暗的格紋（中性灰、平均 50～160、有週期交替）不算角色細節
        for (int i = 0; i < w * h; i++) {
            int c = px[i], l = lumOf(c);
            strong[i] = !neutral(c) || l < 120;
            if (ShadowFix && strong[i] && neutral(c) && l >= 50 && l < 160 && periodic(i)) strong[i] = false;
        }
        var dil = Grow(strong, w, h, N);
        var inv = new bool[w * h]; for (int i = 0; i < w * h; i++) inv[i] = !dil[i];
        var outside = Grow(inv, w, h, N);
        var q = new Queue<int>();
        for (int i = 0; i < w * h; i++) {
            int x = i % w, y = i / w;
            if ((x == 0 || y == 0 || x == w - 1 || y == h - 1) && outside[i] && !strong[i]) { isBg[i] = true; q.Enqueue(i); }
        }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w;
            foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                if (j >= 0 && !isBg[j] && outside[j] && !strong[j]) { isBg[j] = true; q.Enqueue(j); }
        }
        var depth = new int[w * h];
        for (int i = 0; i < w * h; i++) if (isBg[i]) q.Enqueue(i);
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w;
            if (depth[i] >= N) continue;
            foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                if (j >= 0 && !isBg[j] && !strong[j]) { isBg[j] = true; depth[j] = depth[i] + 1; q.Enqueue(j); }
        }
        // 背景兩種格紋亮度：取背景像素亮度直方圖的兩個高峰
        var hist = new int[256]; for (int i = 0; i < w * h; i++) if (isBg[i] && neutral(px[i])) hist[lumOf(px[i])]++;
        int p1 = 0; for (int v = 0; v < 256; v++) if (hist[v] > hist[p1]) p1 = v;
        int p2 = -1; for (int v = 0; v < 256; v++) if (Math.Abs(v - p1) > 25 && (p2 < 0 || hist[v] > hist[p2])) p2 = v;
        var seen = new bool[w * h];
        for (int s0 = 0; s0 < w * h; s0++) {
            if (isBg[s0] || strong[s0] || seen[s0]) continue;
            var list = new List<int>(); seen[s0] = true; q.Enqueue(s0);
            while (q.Count > 0) {
                int i = q.Dequeue(), x = i % w, y = i / w; list.Add(i);
                foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                    if (j >= 0 && !isBg[j] && !strong[j] && !seen[j]) { seen[j] = true; q.Enqueue(j); }
            }
            if (p2 < 0 || list.Count < 20) continue;
            int a = 0, b = 0; foreach (int i in list) { int l = lumOf(px[i]); if (Math.Abs(l - p1) <= 8) a++; else if (Math.Abs(l - p2) <= 8) b++; }
            int per = 0; foreach (int i in list) if (periodic(i)) per++;
            if (a > list.Count * 0.2 && b > list.Count * 0.2 && per > list.Count * 0.35) foreach (int i in list) isBg[i] = true;
        }
    }
    static CutFrame CutChecker(Bitmap sheet, int x0, int y0, int w, int h) {
        var crop = sheet.Clone(new Rectangle(x0, y0, w, h), PixelFormat.Format32bppArgb);
        var px = Read(crop); crop.Dispose();
        var isBg = new bool[w * h];
        var q = new Queue<int>();
        var near = new int[w * h];
        var bgCol = new int[w * h];   // 最近的背景格紋顏色（扣掉背景時用）
        Func<int, int> lumOf = c => (R(c) + G(c) + B(c)) / 3;
        Func<int, bool> neutral = c => Math.Max(R(c), Math.Max(G(c), B(c))) - Math.Min(R(c), Math.Min(G(c), B(c))) < 18;
        if (CheckerSize > 0) CheckerCells(px, isBg, w, h, lumOf, neutral);
        else for (int i = 0; i < w * h; i++) isBg[i] = lumOf(px[i]) > 165 && neutral(px[i]);
        for (int i = 0; i < w * h; i++) {
            near[i] = isBg[i] ? 0 : 99;
            if (isBg[i]) { bgCol[i] = px[i]; q.Enqueue(i); }
        }
        while (q.Count > 0) {
            int i = q.Dequeue(), x = i % w, y = i / w, nd = near[i] + 1;
            if (nd > 8) continue;
            foreach (int j in new[] { x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1 })
                if (j >= 0 && near[j] > nd) { near[j] = nd; bgCol[j] = bgCol[i]; q.Enqueue(j); }
        }
        // 靠近背景（8px 內）的像素：透明度＝與背景的最大色差 ÷ 150，再把背景色扣掉還原顏色（火焰、翼緣的淡色光暈）
        var alpha = new byte[w * h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int i = y * w + x;
            if (isBg[i]) continue;
            int c = px[i]; double a = 1;
            if (near[i] <= 8) {
                int b = bgCol[i];
                double md = Math.Max(Math.Abs(R(c) - R(b)), Math.Max(Math.Abs(G(c) - G(b)), Math.Abs(B(c) - B(b))));
                a = Math.Min(1, md / 150);
                if (a > 0.02 && a < 1) {
                    int nr = (int)Math.Max(0, Math.Min(255, R(b) + (R(c) - R(b)) / a));
                    int ng = (int)Math.Max(0, Math.Min(255, G(b) + (G(c) - G(b)) / a));
                    int nb = (int)Math.Max(0, Math.Min(255, B(b) + (B(c) - B(b)) / a));
                    px[i] = (nr << 16) | (ng << 8) | nb;
                }
            }
            double e = Math.Min(Math.Min(x, w - 1 - x), Math.Min(y, h - 1 - y));
            if (e < 14) a *= e / 14.0;
            alpha[i] = (byte)Math.Round(a * 255);
        }
        return Finish(px, alpha, w, h);
    }

    static CutFrame Finish(int[] px, byte[] alpha, int w, int h) {
        var q = new Queue<int>();
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
            bool keep = c == main || (sizes[c] > big * 0.008 && !(touch[c] && sizes[c] < big * DropEdge));
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
# 去背設定：規格最上層是預設；"alt": { "名稱": { sheet, bg, global, ... } } 是其他來源，
# 某一格寫成 { "r": [x,y,w,h], "src": "名稱" } 就改用那份原圖與設定（新舊兩版原圖各取乾淨的格子混用）
$sheets = @{}
function Get-Mode($o) {
    $p = if ([IO.Path]::IsPathRooted($o.sheet)) { $o.sheet } else { Join-Path $root $o.sheet }
    if (-not (Test-Path $p)) { throw "找不到原圖：$p" }
    if (-not $sheets.ContainsKey($p)) { $sheets[$p] = New-Object System.Drawing.Bitmap $p }
    return @{
        sheet = $sheets[$p]
        tol = if ($o.tol) { [double]$o.tol } else { 34 }
        checker = $o.bg -eq 'checker' -or $o.bg -eq 'checker2'
        checkerSize = if ($o.bg -eq 'checker2') { [int]$o.checkerSize } else { 0 }   # 角色也有白色時（聖騎士白披風）
        shape = if ($o.shape) { [int]$o.shape } else { 0 }   # 角色和背景同色時用形狀去背（魔鬥士黑衣）；checker2 時是輪廓連接半徑
        global = [bool]$o.global   # 被圍住的背景也去掉（角色與背景色差大時用，例如天使）
        dropEdge = if ($o.dropEdge) { [double]$o.dropEdge } else { 0.25 }   # 教堂背景殘片等從格子邊伸進來的雜物
        darkBg = if ($o.darkBg) { [int]$o.darkBg } else { 22 }
        flat = [bool]$o.flat       # 純色灰底：被圍住的背景與陰影也去掉（妖精）
        labels = [bool]$o.labels   # 抹掉格子右下角的金色編號
        shadowLeft = [bool]$o.shadowLeft   # 去掉往左拖的地面長影子（修羅）
        matte = [bool]$o.matte             # 深色漸層底＋深色角色：每列背景色＋柔和透明度＋輪廓內填滿（修羅）
    }
}
$baseMode = Get-Mode $cfg
$pad = if ($cfg.pad) { [int]$cfg.pad } else { 4 }
$dirs = 'down', 'right', 'up'
$frames = @{}
$heights = @()
foreach ($d in $dirs) {
    $frames[$d] = @()
    foreach ($r in $cfg.dirs.$d) {
        $m = $baseMode
        if ($r -is [System.Management.Automation.PSCustomObject]) { $m = Get-Mode $cfg.alt.($r.src); $r = $r.r }
        [SpriteCutter]::CheckerSize = $m.checkerSize
        [SpriteCutter]::ShapeN = if ($m.checkerSize -gt 0) { $m.shape } else { 0 }
        [SpriteCutter]::DropEdge = $m.dropEdge
        [SpriteCutter]::DarkBg = $m.darkBg
        [SpriteCutter]::Flat = $m.flat
        [SpriteCutter]::Labels = $m.labels
        [SpriteCutter]::ShadowLeft = $m.shadowLeft
        [SpriteCutter]::Matte = $m.matte
        [SpriteCutter]::ShadowFix = -not ($r.Count -ge 5 -and [int]$r[4] -eq 0)
        $shape = if ($m.checkerSize -gt 0) { 0 } else { $m.shape }
        $f = [SpriteCutter]::Cut($m.sheet, [int]$r[0], [int]$r[1], [int]$r[2], [int]$r[3], $m.tol, $m.checker, $m.global, $shape)
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
# 選項 "sharpen"（0.6～1.2）、"trim"（圈數）：縮放後銳化、修掉暗色雜邊；背景亮度用第一格原圖左上角
if ($cfg.sharpen -or $cfg.trim) {
    $c0 = $baseMode.sheet.GetPixel([int]$cfg.dirs.down[0][0] + 2, [int]$cfg.dirs.down[0][1] + 2)
    [SpriteCutter]::PostProcess($out, [double]$cfg.sharpen, [int]$cfg.trim, [int](($c0.R + $c0.G + $c0.B) / 3))
}
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
$out.Dispose(); foreach ($s in $sheets.Values) { $s.Dispose() }