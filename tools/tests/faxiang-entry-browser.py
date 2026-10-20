from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
with sync_playwright() as p:
 for built,w,h in [(False,1200,900),(True,390,844),(True,1200,900)]:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad','--disable-breakpad','--no-zygote','--single-process'])
  context=browser.new_context(viewport={'width':w,'height':h});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  prefix='/dist' if built else ''
  page.goto(base+prefix+'/index.html');page.wait_for_function("typeof openYuanshenModal==='function'")
  if not built:
   page.evaluate("document.getElementById('title-screen').style.display='none';document.body.classList.remove('title-mode')")
   expected={'holyBody':'goddess','daoBody':'wood','doublePupil':'water','tyrantBody':'fire','supremeBone':'earth','chaosBody':'demon','swordBody':'goddess','bladeBody':'fire','fanBody':'wind','bowBody':'wood','fluteBody':'water','brushBody':'demon'}
   for gender in ['male','female']:
    for soul,kind in expected.items():
     page.evaluate('([g,t])=>{player.gender=g;player.yuanshen={type:t};openYuanshenModal();}',[gender,soul])
     a=page.locator('.ys-faxiang-link');query=parse_qs(urlparse(a.get_attribute('href')).query)
     assert query['playerGender']==[gender] and query['yuanshen']==[soul] and query['from']==['game']
   page.evaluate("player.gender='female';player.yuanshen={type:'doublePupil'};openYuanshenModal()")
  else:
   page.evaluate('enterWorld()');page.wait_for_selector('#gender-modal',state='visible');page.evaluate("chooseGender('female')");page.evaluate('openYuanshenModal()')
   assert page.evaluate('typeof player')=='undefined','Player leaked from built bundle'
  a=page.locator('.ys-faxiang-link');assert a.inner_text()=='✦ 查看法相天地';assert a.get_attribute('target')=='_blank'
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  before=page.evaluate("localStorage.getItem('xiuxian_save')")
  with page.expect_popup() as pop:a.click()
  preview=pop.value;preview.wait_for_load_state();preview.wait_for_function('FaxiangDemo.snapshot().assetsReady');preview.wait_for_function("document.querySelector('#deity').complete&&document.querySelector('#deity').naturalWidth>0")
  assert preview.evaluate('FaxiangDemo.snapshot().playerGender')=='female'
  assert preview.locator('#player-gender').is_hidden() and preview.locator('#yuanshen').is_disabled()
  if not built:
   assert preview.evaluate('FaxiangDemo.snapshot().type')=='water';assert preview.locator('#type').is_disabled()
  else:assert '尚未凝聚元神' in preview.locator('#entry-note').inner_text()
  assert preview.evaluate('window.opener===null')
  preview.click('#summon');preview.wait_for_timeout(100);assert preview.evaluate('FaxiangDemo.snapshot().phase')!='idle'
  preview.close();assert page.evaluate("localStorage.getItem('xiuxian_save')")==before
  assert page.locator('#yuanshen-modal').is_visible()
  a.scroll_into_view_if_needed()
  assert not errors,errors
  print(f'PASS {"dist" if built else "source"} {w}x{h}: 元神按鈕、新分頁、性別鎖定、存檔隔離、JS錯誤0')
  browser.close()
server.shutdown()
