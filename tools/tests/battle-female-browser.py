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
   for soul in ['holyBody','daoBody','doublePupil','tyrantBody','supremeBone','chaosBody','swordBody','bladeBody','fanBody','bowBody','fluteBody','brushBody']:
    page.evaluate('(s)=>{player.yuanshen={type:s};updateBattleHero()}',soul)
    assert page.locator('#bf-faxiang').count()==0
   page.evaluate("openYuanshenModal();document.getElementById('yuanshen-modal').style.display='none';updateBattleHero()")
   assert page.locator('#bf-faxiang').count()==0
   canvas=page.locator('#bf-female-avatar')
   assert canvas.evaluate('(e)=>Math.abs(e.clientHeight/e.parentElement.clientHeight-.96)<.02')
   assert canvas.evaluate('(e)=>Math.abs(e.clientWidth/e.clientHeight-.8)<.03')
   page.evaluate("battleFemalePose('attack')");page.wait_for_timeout(900)
   page.evaluate("battleCastUntil=0;playerAttackTurn([],[{hp:1e12,attrs:{},status:newStatus()}],[]);flushBattleFx()")
   page.wait_for_timeout(850)
   assert page.locator('#bf-swords .bf-fsword').count()>=24
   assert page.evaluate("battleFemaleAction.kind==='cast' && performance.now()<battleFemaleAction.until")
   page.evaluate("battleFxCast()")
   page.wait_for_timeout(650)
   assert page.locator('#bf-swords .fly').count()>0
   page.wait_for_timeout(1300)
   assert page.locator('#bf-swords .bf-fsword').count()==0
   assert page.locator('#bf-faxiang').count()==0
   page.evaluate("player.gender='male';updateBattleHero()")
   assert page.locator('#bf-faxiang').count()==0 and page.locator('#bf-female-avatar').is_hidden()
   assert page.locator('#bf-hero').is_visible()
   page.evaluate("player.gender='female';player.yuanshen=null;updateBattleHero()")
   assert page.locator('#bf-faxiang').count()==0
  assert page.locator('#bf-faxiang').count()==0
  assert not errors,errors
  print('PASS',built,w,'sprite/proportion/no-unearned-faxiang/gender/console')
  b.close()
s.shutdown()
