"""Pack original compact single-hand sword swing; preserve prior artwork."""
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import importlib.util,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[3]/'images/sprites/morph/flame-death-knight-v1'
spec=importlib.util.spec_from_file_location('morph_pack',ROOT.parent/'sky-valkyrie-v1/prepare.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
DIRS=['down','right','up']
PHASES=['ready','lift','downstroke','contact','follow-through','recover']
GROUND={'down':[495,950],'right':[512,980],'up':[496,970]}
XS=[280,790,1300]

def main():
 sheet=Image.new('RGBA',(2304,960));cells=[];hashes=set()
 for row,d in enumerate(DIRS):
  src=Image.open(ROOT/(d+'-generated.png')).convert('RGBA')
  for f in range(6):
   r,c=divmod(f,3)
   rect=[max(0,c*512-50),max(0,r*512-20),min(1536,(c+1)*512+50),min(1024,(r+1)*512+25)]
   anchor=[XS[c],GROUND[d][r]]
   frameSrc=src;source=d+'-generated.png';body=320
   if d=='right' and f in [3,4]:
    source='right-'+('contact' if f==3 else 'follow-through')+'-generated.png'
    frameSrc=Image.open(ROOT/source).convert('RGBA');rect=[0,0,*frameSrc.size]
    anchor=[600,1020] if f==3 else [650,1050];body=600 if f==3 else 720
   cell=helper.place(frameSrc,rect,anchor,body,cell=(384,320),foot=(192,270))
   bb=cell.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<384 and bb[3]<320,(d,f,bb)
   digest=hashlib.sha256(cell.tobytes()).hexdigest();assert digest not in hashes;hashes.add(digest)
   file=f'frames/attack-v2-{d}-{f+1:02}.png';cell.save(OUT/file,optimize=True)
   sheet.alpha_composite(cell,(f*384,row*320))
   cells.append({'direction':d,'frame':f,'phase':PHASES[f],'source':source,'sourceRect':rect,'sourceFoot':anchor,'sourceBodyHeight':body,'file':file,'bounds':bb})
 sheet.save(OUT/'attack-v2.png',optimize=True)
 sheet.save(OUT/'attack-v2-preview.avif',quality=65,speed=6)
 sheet.resize((1152,480),Image.Resampling.LANCZOS).save(OUT/'attack-v2-contact.png',optimize=True)
 meta={'id':'flame-death-knight-attack-v2','name':'烈焰死亡騎士・短促單手斬','src':'images/sprites/morph/flame-death-knight-v1/attack-v2.png','rows':DIRS,'frames':dict.fromkeys(DIRS,6),'cellW':384,'cellH':320,'footAnchor':[192,270],'charH':160,'drawH':48,'ms':80,'duration':480,'phases':PHASES,'left':'mirror right','cells':cells}
 (OUT/'attack-v2-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (ROOT/'registration.json').write_text(json.dumps(cells,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for c in cells:
  x=c['frame']*384;y=DIRS.index(c['direction'])*320
  assert sheet.crop((x,y,x+384,y+320)).tobytes()==Image.open(OUT/c['file']).convert('RGBA').tobytes()
 print('PASS: 18 distinct RGBA attack poses, transparent margins, exact atlas correspondence; original attack retained')
if __name__=='__main__':main()
