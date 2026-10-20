from pathlib import Path
import base64,json,zipfile
root=Path(__file__).resolve().parent

def embed(html,scripts):
 for script in scripts:
  html=html.replace(f'<script src="{script}"></script>','<script>'+(root/script).read_text()+'</script>')
 assets={}
 for f in (root/'assets').iterdir():
  path='assets/'+f.name
  if f.suffix in ['.png','.jpg'] and path in html:assets[path]=('data:image/jpeg;base64,' if f.suffix=='.jpg' else 'data:image/png;base64,')+base64.b64encode(f.read_bytes()).decode()
 preamble='<script>window.DEMO_ASSETS='+json.dumps(assets,separators=(',',':'))+';</script>'
 return html.replace('<script>',preamble+'<script>',1)
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
html=embed(html,['faxiang-config.js','sprite-renderer.js','app.js'])
output=root.parent/'法相天地-獨立測試版.html';output.write_text(html)
gallery=embed((root/'gallery.html').read_text(),['faxiang-config.js'])
gallery=gallery.replace('index.html?faxiang=', '法相天地-獨立測試版.html?faxiang=')
gallery_output=root.parent/'七元神法相圖鑑.html';gallery_output.write_text(gallery)
with zipfile.ZipFile(root.parent/'法相天地-測試版與原始碼.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts:z.write(p,'faxiang-demo/'+str(p.relative_to(root)))
 z.write(output,output.name);z.write(gallery_output,gallery_output.name)
print('已更新單檔 HTML 與原始碼 ZIP（各圖只嵌入一次）')
