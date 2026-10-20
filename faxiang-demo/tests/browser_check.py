from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 for w,h in [(1200,1000),(390,844),(320,700)]:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad','--disable-breakpad','--no-zygote','--single-process'])
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<600,has_touch=w<600);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
  page.wait_for_function("document.querySelector('#deity').complete && document.querySelector('#deity').naturalWidth > 0")
  page.wait_for_function('FaxiangDemo.snapshot().assetsReady')
  page.wait_for_function("document.querySelector('#deity').complete && document.querySelector('#deity').naturalWidth>0")
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
  before=page.evaluate('JSON.stringify(localStorage)')
  page.clock.install();page.click('#summon');page.clock.run_for(400)
  assert page.evaluate('FaxiangDemo.snapshot().phase')=='gather'
  assert not page.evaluate('FaxiangDemo.summon()'), 'double summon accepted'
  page.clock.run_for(700);assert page.evaluate('FaxiangDemo.snapshot().phase')=='manifest'
  if w!=320: page.screenshot(path=str(ROOT/f'preview-{"desktop" if w>600 else "mobile"}.png'),full_page=True)
  page.clock.run_for(1100);assert page.evaluate('FaxiangDemo.snapshot().phase')=='attack'
  page.clock.run_for(800);assert page.evaluate('FaxiangDemo.snapshot().phase')=='dissolve'
  page.clock.run_for(1100);assert page.evaluate('FaxiangDemo.snapshot().phase')=='idle'
  page.locator('summary').click();page.uncheck('#auto');page.click('#summon');page.clock.run_for(2200);assert page.evaluate('FaxiangDemo.snapshot().phase')=='hold'
  page.click('#attack');page.clock.run_for(300);assert page.evaluate('FaxiangDemo.snapshot().phase')=='attack'
  page.click('#dismiss');page.clock.run_for(1100);assert page.evaluate('FaxiangDemo.snapshot().phase')=='idle'
  for t in ['goddess','wood','water','fire','earth','demon','wind']:
   page.select_option('#type',t);page.wait_for_function("document.querySelector('#deity').complete && document.querySelector('#deity').naturalWidth>0");page.click('#summon');page.clock.run_for(300);page.click('#dismiss');page.clock.run_for(1100)
  page.locator('[data-dir=back]').click();assert page.evaluate('FaxiangDemo.snapshot().dir')=='back'
  page.select_option('#type','water');page.click('#summon');page.clock.run_for(250);page.select_option('#type','fire');assert page.evaluate('FaxiangDemo.snapshot().phase')=='idle'
  for direction,row in [('front',0),('side',1),('back',2)]:
   page.locator(f'[data-dir={direction}]').click();page.select_option('#motion','walk');page.clock.run_for(130)
   assert page.evaluate('FaxiangDemo.snapshot().row')==str(row)
   assert page.evaluate('FaxiangDemo.snapshot().motion')=='walk'
   page.click('#attack');page.clock.run_for(240);assert page.evaluate('FaxiangDemo.snapshot().motion')=='attack'
   assert page.evaluate('FaxiangDemo.snapshot().row')==str(row)
  for variant in ['0','1','2']:
   page.select_option('#cast-variant',variant);page.select_option('#motion','cast');page.clock.run_for(120)
   assert page.evaluate('FaxiangDemo.snapshot().row')==variant
  if w<600:
   page.locator('#arena').scroll_into_view_if_needed();page.clock.run_for(100);r=page.locator('#arena').bounding_box();page.touchscreen.tap(r['x']+r['width']*.3,r['y']+r['height']*.8);page.clock.run_for(100)
   assert abs(page.evaluate('FaxiangDemo.snapshot().x')-.3)<.02
  else:
   page.evaluate('document.activeElement.blur()');page.keyboard.press('ArrowRight');page.clock.run_for(100);assert page.evaluate('FaxiangDemo.snapshot().x')>.5
  for gender in ['male','female']:
   page.select_option('#player-gender',gender)
   for t in page.evaluate('Object.keys(FAXIANG_CONFIG)'):
    page.select_option('#type',t);page.wait_for_function("document.querySelector('#deity').complete && document.querySelector('#deity').naturalWidth>0")
    assert page.evaluate('FaxiangDemo.snapshot().faxiangGender')==gender
    assert page.evaluate('FaxiangDemo.snapshot().playerGender')==gender
    assert page.locator('#type-name').inner_text()==page.evaluate('([id,g])=>FAXIANG_VARIANTS[id][g].name',[t,gender])
    page.click('#summon');page.clock.run_for(2100);page.click('#dismiss');page.clock.run_for(1100)
  for key in page.evaluate('Object.keys(FAXIANG_YUANSHEN)'):
   page.select_option('#yuanshen',key);page.clock.run_for(20)
   assert page.evaluate('FaxiangDemo.snapshot().type')==page.evaluate('(k)=>FAXIANG_YUANSHEN[k].faxiang',key)
  assert page.evaluate('JSON.stringify(localStorage)')==before
  assert not errors,errors
  print(f'PASS {w}x{h}: phases, reentry, manual attack/dismiss, switching, overflow, save isolation; JS errors=0')
  if w==1200:
   page.goto(f'http://127.0.0.1:{server.server_port}/gallery.html')
   page.wait_for_function("document.querySelectorAll('article img').length===14 && [...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0)")
   page.screenshot(path=str(ROOT/'十四法相總覽.png'),full_page=True)
   for gender,label in [('male','男性'),('female','女性')]:
    page.locator(f'[data-filter={gender}]').click();assert page.locator('article:visible').count()==7
    page.screenshot(path=str(ROOT/f'{label}法相總覽.png'),full_page=True)
  b.close()
server.shutdown()
