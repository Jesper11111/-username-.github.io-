# 技能圖示大圖裁切（ARCHITECTURE.md 第 41 節）。用法：
#   .\tools\cut-icons.ps1 -Src tools\icon-src\第一張.jfif -Prefix a -OutDir 暫存資料夾 -FixCols 18 -FixX0 16 -FixPitch 198.5 -FixW 178
#   .\tools\cut-icons.ps1 -Src tools\icon-src\第二張.jfif -Prefix b -OutDir 暫存資料夾
# 檔名＝前綴＋列兩碼＋欄兩碼；挑好的圖複製到 images\icons\sk\，對照表在 data\icons.js 的 SKILL_IMG。
param([string]$Src, [string]$Prefix, [string]$OutDir, [int]$Thresh = 60, [int]$FixCols = 0, [double]$FixX0 = 0, [double]$FixPitch = 0, [int]$FixW = 0)
# 把黑底拼圖切成單張圖示：用 C# 算每欄／每列「有亮點」的比例，找出圖示所在的欄區段與列區段，再逐格裁切成 128×128 JPG
Add-Type -AssemblyName System.Drawing
if (-not ('IconSlicer' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices; using System.Collections.Generic;
public static class IconSlicer {
    public static int[][] Profiles(Bitmap b, int thresh) {
        var r = new Rectangle(0, 0, b.Width, b.Height);
        var d = b.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
        int stride = d.Stride; var buf = new byte[stride * b.Height]; Marshal.Copy(d.Scan0, buf, 0, buf.Length); b.UnlockBits(d);
        var col = new int[b.Width]; var row = new int[b.Height];
        for (int y = 0; y < b.Height; y++) for (int x = 0; x < b.Width; x++) {
            int i = y * stride + x * 3; int v = Math.Max(buf[i], Math.Max(buf[i + 1], buf[i + 2]));
            if (v > thresh) { col[x]++; row[y]++; }
        }
        return new int[][] { col, row };
    }
    // 連續「計數 >= minCount」的區段，長度至少 minLen
    public static List<int[]> Runs(int[] p, int minCount, int minLen) {
        var res = new List<int[]>(); int s = -1;
        for (int i = 0; i <= p.Length; i++) {
            bool on = i < p.Length && p[i] >= minCount;
            if (on && s < 0) s = i;
            if (!on && s >= 0) { if (i - s >= minLen) res.Add(new int[] { s, i - 1 }); s = -1; }
        }
        return res;
    }
}
'@
}
$b = [System.Drawing.Bitmap]::FromFile($Src)
$p = [IconSlicer]::Profiles($b, $Thresh)
$cols = [IconSlicer]::Runs($p[0], [int]($b.Height * 0.02), 60)
$rows = [IconSlicer]::Runs($p[1], [int]($b.Width * 0.01), 60)
if ($FixCols -gt 0) { $cols = @(0..($FixCols - 1) | % { $x = [int]($FixX0 + $_ * $FixPitch); ,@($x, ($x + $FixW - 1)) }) }
"cols $($cols.Count): " + (($cols | % { "$($_[0])-$($_[1])" }) -join ' ')
"rows $($rows.Count): " + (($rows | % { "$($_[0])-$($_[1])" }) -join ' ')
$enc = @([System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' })[0]
$ep = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality), ([int64]90)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$n = 0
for ($ri = 0; $ri -lt $rows.Count; $ri++) { for ($ci = 0; $ci -lt $cols.Count; $ci++) {
    $x0 = $cols[$ci][0]; $x1 = $cols[$ci][1]; $y0 = $rows[$ri][0]; $y1 = $rows[$ri][1]
    $w = $x1 - $x0 + 1; $h = $y1 - $y0 + 1; $sz = [Math]::Max($w, $h)
    $cx = $x0 + $w / 2; $cy = $y0 + $h / 2
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList 128, 128
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Black); $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
    $g.DrawImage($b, (New-Object System.Drawing.Rectangle -ArgumentList 0, 0, 128, 128), (New-Object System.Drawing.Rectangle -ArgumentList ([int]($cx - $sz / 2)), ([int]($cy - $sz / 2)), ([int]$sz), ([int]$sz)), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    # 整格幾乎全黑（拼圖最後一列的空位）就不存
    $lit = 0; for ($yy = 8; $yy -lt 120; $yy += 8) { for ($xx = 8; $xx -lt 120; $xx += 8) { $c = $bmp.GetPixel($xx, $yy); if ([Math]::Max($c.R, [Math]::Max($c.G, $c.B)) -gt 60) { $lit++ } } }
    if ($lit -gt 3) { $bmp.Save((Join-Path $OutDir ('{0}{1:D2}{2:D2}.jpg' -f $Prefix, $ri, $ci)), $enc, $ep); $n++ }
    $bmp.Dispose()
} }
$b.Dispose()
"saved $n"
