"""Register independently drawn directional poses; preserve original references and alpha."""
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import importlib.util
import json
import hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[3]/'images/sprites/morph/sky-valkyrie-v2'
spec=importlib.util.spec_from_file_location('morph_pack',ROOT.parent/'sky-valkyrie-v1/prepare.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
DIRS=['down','right','up']
CELL=(384,320)
FOOT=(192,270)
MS={'walk':160,'attack':140,'cast':220,'hit':160}

def main():
    specs=json.loads((ROOT/'registration.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    manifest={'id':'sky-valkyrie-v2','name':'蒼穹女武神・艾爾（神話）','form':'m04','status':'game-appearance',
        'rows':DIRS,'left':'mirror right','cellW':384,'cellH':320,'footAnchor':list(FOOT),'charH':160,'drawH':48,
        'actions':{},'notes':['Original four reference files preserved','Replacement from supplied 4-1/4-2/4-3 sheets; v1 preserved','Background extracted and release/recovery corrected','Back attack frames 3/4 repaired to back view','Left direction mirrors right']}
    audit=[];hashes=set()
    contact=Image.new('RGBA',(1536,3840))
    for ai,action in enumerate(MS):
        n=4 if action in ['walk','attack'] else 2
        sheet=Image.new('RGBA',(n*384,960))
        meta={'src':f'images/sprites/morph/sky-valkyrie-v2/{action}.png','cellW':384,'cellH':320,
            'frames':dict.fromkeys(DIRS,n),'ms':MS[action],'cells':[]}
        if action=='attack':meta['phases']=['aim','draw','release','recover']
        for d,direction in enumerate(DIRS):
            src=Image.open(ROOT/(direction+'-generated.png')).convert('RGBA')
            for f in range(n):
                i=f if action=='walk' else 4+f if action=='attack' else 8+f if action=='cast' else 10+f
                cfg=specs[direction][i]
                cell=helper.place(src,cfg['rect'],cfg['foot'],cfg['body'],cell=CELL,foot=FOOT)
                name=f'{action}-{direction}-{f+1:02}.png'
                digest=hashlib.sha256(cell.tobytes()).hexdigest();assert digest not in hashes,name;hashes.add(digest)
                bb=cell.getbbox();assert bb[0]>0 and bb[1]>0 and bb[2]<384 and bb[3]<320,(name,bb)
                cell.save(OUT/'frames'/name,optimize=True);sheet.alpha_composite(cell,(f*384,d*320))
                contact.alpha_composite(cell,(f*384,(ai*3+d)*320))
                info={'direction':direction,'frame':f,'source':direction+'-generated.png','sourceRect':cfg['rect'],
                    'sourceFoot':cfg['foot'],'sourceBodyHeight':cfg['body'],'file':'frames/'+name}
                meta['cells'].append(info);audit.append(dict(info,bounds=bb))
        sheet.save(OUT/(action+'.png'),optimize=True)
        sheet.save(OUT/(action+'-preview.avif'),quality=62,speed=6)
        sheet.resize((n*192,480),Image.Resampling.LANCZOS).save(OUT/(action+'-contact.png'),optimize=True)
        manifest['actions'][action]=meta
    contact.resize((768,1920),Image.Resampling.LANCZOS).save(OUT/'contact.png',optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for a,m in manifest['actions'].items():
        sheet=Image.open(OUT/(a+'.png')).convert('RGBA')
        for c in m['cells']:
            d=DIRS.index(c['direction']);f=c['frame']
            assert sheet.crop((f*384,d*320,(f+1)*384,(d+1)*320)).tobytes()==Image.open(OUT/c['file']).convert('RGBA').tobytes()
    print('PASS: 36 unique RGBA poses, transparent margins and exact atlas correspondence')

if __name__=='__main__':main()
