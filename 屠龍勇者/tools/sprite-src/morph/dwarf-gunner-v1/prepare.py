"""Register supplied poses and newly drawn gun/casting actions without replacing originals."""
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import importlib.util
import json
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[3]/'images/sprites/morph/dwarf-gunner-v1'
spec=importlib.util.spec_from_file_location('morph_pack',ROOT.parent/'sky-valkyrie-v1/prepare.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
DIRS=['down','right','up']
CELL=(384,320)
FOOT=(192,270)
MS={'walk':130,'attack':140,'cast':220,'hit':150}

def source_cell(action,d,f,cache):
    if action in ['walk','attack']:
        fn=action+'-generated.png';src=cache[fn]
        cuts=[0,346,678,1024]
        rect=[f*384,cuts[d],(f+1)*384,cuts[d+1]]
        if action=='attack':
            if f==2:rect[2]=1200
            anchor=[[[185,565,955,1380],[193,569,955,1381],[210,595,985,1408]][d][f],[324,660,998][d]]
            body=[232,249,260][d]
        else:
            anchor=[[[212,574,966,1388],[218,584,964,1388],[223,594,981,1408]][d][f],[342,660,998][d]]
            body=[242,251,260][d]
        source_cell=[d,f]
    elif action=='cast' and d==1:
        fn='side-cast-generated.png';src=cache[fn]
        rect=[f*768,0,(f+1)*768,1024]
        anchor=[[400,1164][f],932];body=550;source_cell=[0,f]
    elif action=='cast':
        fn='cast-front-back-generated.png';src=cache[fn];r=0 if d==0 else 1
        rect=[f*627,r*627,(f+1)*627,(r+1)*627]
        anchor=[[[350,936],[330,930]][r][f],[617,1188][r]];body=[440,415][r];source_cell=[r,f]
    else:
        fn='hit-generated.png';src=cache[fn];cuts=[0,562,1024,1536]
        rect=[f*512,cuts[d],(f+1)*512,cuts[d+1]]
        anchor=[[[320,805],[339,831],[340,839]][d][f],[536,1005,1455][d]]
        body=[330,345,335][d];source_cell=[d,f]
    return src,fn,rect,anchor,body,source_cell

def main():
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    cache={fn:Image.open(ROOT/fn).convert('RGBA') for fn in ['walk-generated.png','attack-generated.png','side-cast-generated.png','cast-front-back-generated.png','hit-generated.png']}
    manifest={'id':'dwarf-gunner-v1','name':'矮人蒸氣火銃兵（藍變）','form':'m05','status':'game-appearance',
        'rows':DIRS,'left':'mirror right','cellW':384,'cellH':320,'footAnchor':list(FOOT),'charH':160,'drawH':48,
        'actions':{},'notes':['Original files and initial extraction preserved','All final actions redrawn to avoid cross-cell steam clipping','Original back attack pair faces front; replaced','Side casting supplied only one pose; replaced by two','Projectile-only source space is never a character frame']}
    contact=Image.new('RGBA',(1536,3840))
    audit=[]
    for ai,action in enumerate(MS):
        n=4 if action in ['walk','attack'] else 2
        sheet=Image.new('RGBA',(n*384,960))
        meta={'src':f'images/sprites/morph/dwarf-gunner-v1/{action}.png','cellW':384,'cellH':320,
            'frames':dict.fromkeys(DIRS,n),'ms':MS[action],'cells':[]}
        if action=='attack':meta['phases']=['ready','aim','fire-recoil','recover']
        for d in range(3):
            for f in range(n):
                src,fn,rect,anchor,body,sc=source_cell(action,d,f,cache)
                cell=helper.place(src,rect,anchor,body,cell=CELL,foot=FOOT)
                name=f'{action}-{DIRS[d]}-{f+1:02}.png';cell.save(OUT/'frames'/name,optimize=True)
                sheet.alpha_composite(cell,(f*384,d*320))
                contact.alpha_composite(cell,(f*384,(ai*3+d)*320))
                info={'direction':DIRS[d],'frame':f,'source':fn,'sourceCell':sc,'sourceRect':rect,'sourceFoot':anchor,'sourceBodyHeight':body,'file':'frames/'+name}
                meta['cells'].append(info);audit.append(dict(info,bounds=cell.getbbox()))
        sheet.save(OUT/(action+'.png'),optimize=True)
        sheet.save(OUT/(action+'-preview.avif'),quality=65,speed=6)
        sheet.save(OUT/(action+'-preview.webp'),quality=88,method=6)
        sheet.resize((n*192,480),Image.Resampling.LANCZOS).save(OUT/(action+'-contact.png'),optimize=True)
        manifest['actions'][action]=meta
    contact.resize((768,1920),Image.Resampling.LANCZOS).save(OUT/'contact.png',optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 36 transparent dwarf poses')

if __name__=='__main__':main()
