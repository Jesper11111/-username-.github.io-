"""Register a complete eight-phase gait; fixed pelvis/ground anchors per row."""
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
XS=[245,630,1010,1395]
BOUNDS={'down':[(0,400),(380,795),(765,1185),(1150,1536)],'right':[(0,475),(380,855),(765,1230),(1150,1536)],'up':[(0,450),(380,835),(765,1210),(1150,1536)]}
GROUND={'down':[480,950],'right':[490,966],'up':[486,960]}
PHASES=['near-contact','near-support','far-passing','far-swing','far-contact','far-support','near-passing','near-swing']
def main():
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
 sheet=Image.new('RGBA',(3072,960));cells=[];hashes=set()
 for row,d in enumerate(DIRS):
  src=Image.open(ROOT/(d+'-generated.png')).convert('RGBA')
  for f in range(8):
   r,c=divmod(f,4);x0,x1=BOUNDS[d][c]
   rect=[x0,r*512,x1,(r+1)*512];anchor=[XS[c],GROUND[d][r]]
   cell=helper.place(src,rect,anchor,320,cell=(384,320),foot=(192,270))
   bb=cell.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<384 and bb[3]<320,(d,f,bb)
   digest=hashlib.sha256(cell.tobytes()).hexdigest();assert digest not in hashes;hashes.add(digest)
   file=f'frames/walk-v2-{d}-{f+1:02}.png';cell.save(OUT/file,optimize=True)
   sheet.alpha_composite(cell,(f*384,row*320))
   cells.append({'direction':d,'frame':f,'phase':PHASES[f],'source':d+'-generated.png','sourceRect':rect,'sourceFoot':anchor,'sourceBodyHeight':320,'file':file,'bounds':bb})
 sheet.save(OUT/'walk-v2.png',optimize=True)
 sheet.save(OUT/'walk-v2-preview.avif',quality=65,speed=6)
 sheet.resize((1536,480),Image.Resampling.LANCZOS).save(OUT/'walk-v2-contact.png',optimize=True)
 meta={'id':'flame-death-knight-walk-v2','name':'烈焰死亡騎士・走路修正','src':'images/sprites/morph/flame-death-knight-v1/walk-v2.png','rows':DIRS,'frames':dict.fromkeys(DIRS,8),'cellW':384,'cellH':320,'footAnchor':[192,270],'charH':160,'drawH':48,'ms':65,'duration':520,'phases':PHASES,'left':'mirror right','cells':cells}
 (OUT/'walk-v2-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (ROOT/'registration.json').write_text(json.dumps(cells,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for c in cells:
  x=c['frame']*384;y=DIRS.index(c['direction'])*320
  assert sheet.crop((x,y,x+384,y+320)).tobytes()==Image.open(OUT/c['file']).convert('RGBA').tobytes()
 print('PASS: 24 distinct RGBA gait poses, fixed pelvis anchors, transparent margins, atlas correspondence; old assets preserved')
if __name__=='__main__':main()
