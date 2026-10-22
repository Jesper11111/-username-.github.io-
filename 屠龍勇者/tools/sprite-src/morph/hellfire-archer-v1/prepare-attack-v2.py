"""Pack new low-bow / draw / release / recover poses, preserving old art."""
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import importlib.util
import json
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[3]/'images/sprites/morph/hellfire-archer-v1'
spec=importlib.util.spec_from_file_location('valk_pack',ROOT.parent/'sky-valkyrie-v1/prepare.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
DIRS=['down','right','up']
XS=[[200,555,956,1352],[200,557,966,1370],[208,620,1034,1400]]
YS=[343,672,994]
BODY=[[300,278,280,280],[288,269,269,268],[290,276,267,276]]

def main():
    src=Image.open(ROOT/'attack-motion-v2-generated.png').convert('RGBA')
    out=OUT/'attack-v2-frames';out.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGBA',(1280,840))
    meta={'src':'images/sprites/morph/hellfire-archer-v1/attack-v2.png','cellW':320,'cellH':280,
        'frames':dict.fromkeys(DIRS,4),'ms':140,'phases':['ready','draw','release','recover'],'cells':[]}
    cuts=[0,348,678,1024]
    for d in range(3):
        for f in range(4):
            rect=[f*384,cuts[d],(f+1)*384,cuts[d+1]]
            anchor=[XS[d][f],YS[d]]
            cell=helper.place(src,rect,anchor,BODY[d][f],cell=(320,280),foot=(160,240))
            fn=f'attack-{DIRS[d]}-{f+1:02}.png';cell.save(out/fn,optimize=True)
            sheet.alpha_composite(cell,(f*320,d*280))
            meta['cells'].append({'direction':DIRS[d],'frame':f,'file':'attack-v2-frames/'+fn,
                'source':'attack-motion-v2-generated.png','sourceRect':rect,'sourceFoot':anchor,'sourceBodyHeight':BODY[d][f]})
    sheet.save(OUT/'attack-v2.png',optimize=True)
    sheet.save(OUT/'attack-v2-preview.webp',quality=88,method=6)
    (OUT/'attack-v2-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 12 corrected skeleton attack poses')

if __name__=='__main__':main()
