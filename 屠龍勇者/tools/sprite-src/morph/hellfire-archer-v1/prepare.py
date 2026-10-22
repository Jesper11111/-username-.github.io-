"""Pack supplied character poses, three added channeling poses and separate arrows."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import importlib.util
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/hellfire-archer-v1'
spec = importlib.util.spec_from_file_location('moon_cut', ROOT.parent / 'moon-ranger-v1/prepare.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
DIRS = ['down', 'right', 'up']
YS = [0, 193, 375, 550, 730, 907, 1084]
FEET = [193, 367, 544, 719, 899, 1076]
HEIGHT = [140, 132, 145, 145, 156, 151]
CENTRES = [121, 363, 606, 849, 1091, 1335]
MS = {'walk':130, 'attack':140, 'cast':220, 'hit':150}

def pack(source, rect, anchor, body):
    crop = helper.isolate(source.crop(rect))
    bounds = crop.getbbox()
    assert bounds
    x, y = rect[0]+bounds[0], rect[1]+bounds[1]
    crop = crop.crop(bounds)
    scale = 160/body
    crop = crop.resize((round(crop.width*scale), round(crop.height*scale)), Image.Resampling.LANCZOS)
    dx, dy = round(160+(x-anchor[0])*scale), round(240+(y-anchor[1])*scale)
    assert min(dx,dy)>=0 and dx+crop.width<=320 and dy+crop.height<=280, (rect, dx, dy, crop.size)
    cell = Image.new('RGBA', (320,280))
    cell.alpha_composite(crop, (dx,dy))
    return cell

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'frames').mkdir(exist_ok=True)
    src = Image.open(ROOT/'sheet-transparent.png').convert('RGBA')
    extra = Image.open(ROOT/'cast-extra.png').convert('RGBA')
    manifest = {'id':'hellfire-archer-v1', 'name':'冥火骷髏神射（紫變）',
        'status':'appearance-preview-only', 'level':None, 'effects':None,
        'cellW':320, 'cellH':280, 'charH':160, 'drawH':48,
        'footAnchor':[160,240], 'rows':DIRS, 'left':'mirror right', 'actions':{}, 'projectiles':[]}
    contact = Image.new('RGBA', (1280,3360))
    for ai, action in enumerate(MS):
        n = 4 if action in ['walk','attack'] else 2
        sheet = Image.new('RGBA', (n*320,840))
        meta = {'src':f'images/sprites/morph/hellfire-archer-v1/{action}.png',
            'cellW':320,'cellH':280,'frames':dict.fromkeys(DIRS,n),'ms':MS[action],'cells':[]}
        for d, base in enumerate([0,4,2]):
            for f in range(n):
                if action=='cast' and f==0:
                    ec = [0,1,2][d]
                    rect = [ec*724,0,(ec+1)*724,724]
                    anchor = [(400,703),(1140,703),(1855,700)][d]
                    cell = pack(extra,rect,anchor,550)
                    info = {'source':'cast-extra.png','sourceRect':rect,'sourceFoot':list(anchor)}
                else:
                    r,c = ((base,f) if action=='walk' else
                        (base,4+f) if action=='attack' and f<2 else
                        (base+1,f-2) if action=='attack' else
                        (base+1,3) if action=='cast' else (base+1,4+f))
                    rect = [round(c*src.width/6),YS[r],round((c+1)*src.width/6),YS[r+1]]
                    # Back release arrows protrude above their cells; keep the whole pose.
                    if action=='attack' and d==2 and f>=2: rect[1]=530
                    if action=='attack' and d==1: rect[1]=700 if f<2 else 886
                    if action=='hit' and d==1 and f==0: rect[0]=1000
                    anchor = [CENTRES[c],FEET[r]]
                    body = HEIGHT[r]
                    if action=='cast': body = [129,151,145][d]
                    cell = pack(src,rect,anchor,body)
                    info = {'source':'sheet-transparent.png','sourceCell':[r,c],'sourceRect':rect,'sourceFoot':anchor}
                fn = f'{action}-{DIRS[d]}-{f+1:02}.png'
                cell.save(OUT/'frames'/fn,optimize=True)
                sheet.alpha_composite(cell,(f*320,d*280))
                contact.alpha_composite(cell,(f*320,(ai*3+d)*280))
                meta['cells'].append(dict(info,direction=DIRS[d],frame=f,file='frames/'+fn))
        sheet.save(OUT/(action+'.png'),optimize=True)
        sheet.save(OUT/(action+'-preview.webp'),quality=88,method=6)
        manifest['actions'][action]=meta
    for d,r in enumerate([1,5,3]):
        rect = [[470,244,716,310],[484,932,710,1003],[511,579,707,647]][d]
        crop = src.crop(rect)
        bounds = crop.getbbox()
        crop = crop.crop(bounds)
        fn = 'projectile-'+DIRS[d]+'.png'
        crop.save(OUT/fn,optimize=True)
        manifest['projectiles'].append({'direction':DIRS[d],'file':fn,'sourceCell':[r,2],'sourceRect':rect})
    contact.save(OUT/'contact.png',optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 36 character frames and 3 independent projectile assets')

if __name__=='__main__': main()
