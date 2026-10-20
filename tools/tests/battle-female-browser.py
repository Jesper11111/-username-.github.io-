from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
root=str(Path(__file__).resolve().parents[2])
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=root));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 for built,w in [(False,1200),(True,390)]:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad','--disable-breakpad','--no-zygote','--single-process']);page=b.new_page(viewport={'width':w,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{s.server_port}/'+('dist/' if built else '')+'index.html');page.wait_for_function("typeof enterWorld==='function'")
  if built:
   page.evaluate("enterWorld()");page.wait_for_selector('#gender-modal',state='visible');page.evaluate("chooseGender('female');switchTab('battle')")
  else:
   page.evaluate("document.getElementById('title-screen').style.display='none';document.body.classList.remove('title-mode');player.gender='female';player.yuanshen={type:'holyBody'};updateBattleHero();document.getElementById('combat-visual-panel').style.display='block';for(let e=document.getElementById('combat-visual-panel');e;e=e.parentElement){if(getComputedStyle(e).display==='none')e.style.display='block'};layoutBattleHero()")
  page.wait_for_selector('.bf-avatar-ready',state='attached');page.wait_for_timeout(100)
  if not built:
   for soul,file in [('holyBody','goddess.png'),('chaosBody','thunder-female.png'),('fanBody','wind-female.png')]:
    page.evaluate('(s)=>{player.yuanshen={type:s};updateBattleHero()}',soul)
    assert page.locator('#bf-faxiang').get_attribute('src').endswith(file)
   page.evaluate("player.yuanshen={type:'holyBody'};updateBattleHero()")
   assert page.locator('#bf-faxiang').evaluate('(e)=>getComputedStyle(e).opacity')=='0.45'
   assert page.locator('#bf-faxiang').evaluate('(e)=>Math.abs(e.getBoundingClientRect().height/e.parentElement.getBoundingClientRect().height-.5)<.01')
   page.evaluate("battleFemalePose('attack')");page.wait_for_timeout(900)
   assert page.locator('#bf-faxiang').is_visible()
   page.wait_for_timeout(11000);assert page.locator('#bf-faxiang').is_visible()
   page.evaluate("player.gender='male';updateBattleHero()")
   assert page.locator('#bf-faxiang').is_hidden() and page.locator('#bf-female-avatar').is_hidden()
   assert page.locator('#bf-hero').is_visible()
   page.evaluate("player.gender='female';player.yuanshen=null;updateBattleHero()")
   assert page.locator('#bf-faxiang').is_hidden()
  assert not errors,errors
  print('PASS',built,w,'sprite/fallback/gender/persistence/50%/45%/console')
  b.close()
s.shutdown()
