# 本機測試用靜態伺服器（這台電腦沒有 Python／Node）：powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Root . -Port 8780
# Claude 預覽面板用 .claude/launch.json 的 game 設定啟動；遊戲不會載入此檔
param([string]$Root, [int]$Port = 8780)
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css'; '.jpg'='image/jpeg'; '.png'='image/png'; '.mp4'='video/mp4'; '.json'='application/json'; '.webp'='image/webp'; '.svg'='image/svg+xml' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
while ($l.IsListening) {
  $ctx = $l.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    $f = Join-Path $Root $path
    if (Test-Path $f -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($f)
      $ext = [IO.Path]::GetExtension($f).ToLower()
      $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
  } catch {} finally { $ctx.Response.Close() }
}
