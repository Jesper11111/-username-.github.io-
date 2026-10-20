from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.parse import quote
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad','--disable-breakpad','--no-zygote','--single-process'])
 page=b.new_page(viewport={'width':1000,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/'+quote('法相天地-獨立測試版.html'),timeout=60000)
 page.wait_for_function('FaxiangDemo.snapshot().assetsReady',timeout=60000)
 page.wait_for_function("document.querySelector('#deity').complete&&document.querySelector('#deity').naturalWidth>0")
 for gender in ['male','female']:
  page.select_option('#player-gender',gender)
  for element in page.evaluate('Object.keys(FAXIANG_VARIANTS)'):
   page.select_option('#type',element)
   page.wait_for_function("document.querySelector('#deity').complete&&document.querySelector('#deity').naturalWidth>0")
   assert page.locator('#deity').get_attribute('src').startswith('data:image/png;base64,')
 assert not errors,errors
 print('PASS 單檔HTML：角色圖集與14款法相內嵌圖片均可載入，JS錯誤0')
 b.close()
server.shutdown()
