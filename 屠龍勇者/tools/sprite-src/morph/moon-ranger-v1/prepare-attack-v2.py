"""Pack genuinely distinct ready / draw / release / recover attack poses."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/moon-ranger-v1'
DIRS = ['down','right','up']
CENTRES = [[205,580,960,1350],[210,570,970,1360],[195,565,958,1350]]
FEET = [333,681,1005]
BODY = [[290,274,274,290],[290,273,273,289],[280,273,273,280]]

def main():
    src = Image.open(ROOT/'attack-motion-v2-transparent.png').convert('RGBA')
    sheet = Image.new('RGBA',(1280,720))
    frames = OUT/'attack-v2-frames'
    frames.mkdir(exist_ok=True)
    meta = {'src':'images/sprites/morph/moon-ranger-v1/attack-v2.png',
        'cellW':320,'cellH':240,'frames':dict.fromkeys(DIRS,4),'ms':140,
        'phases':['ready','draw','release','recover'],'cells':[]}
    for d in range(3):
        for f in range(4):
            rect = [f*384,round(d*1024/3),(f+1)*384,round((d+1)*1024/3)]
            crop = src.crop(rect)
            # The generated PNG has hidden RGB in zero-alpha background; clear it.
            crop.putalpha(crop.getchannel('A').point(lambda v: v if v>8 else 0))
            alpha = np.array(crop.getchannel('A'))
            work = alpha>=160
            h,w = work.shape
            components=[]
            for y,x in zip(*np.where(work)):
                if not work[y,x]: continue
                q=deque([(int(x),int(y))]); work[y,x]=False; points=[]
                while q:
                    px,py=q.popleft(); points.append((px,py))
                    for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                        if 0<=nx<w and 0<=ny<h and work[ny,nx]:
                            work[ny,nx]=False; q.append((nx,ny))
                components.append(points)
            points=np.array(max(components,key=len))
            keep=np.zeros((h,w),dtype=np.uint8)
            keep[points[:,1],points[:,0]]=255
            mask=np.array(Image.fromarray(keep).filter(ImageFilter.MaxFilter(9)))
            crop.putalpha(Image.fromarray(np.where(mask>0,alpha,0).astype('uint8')))
            bounds = crop.getbbox()
            assert bounds
            crop = crop.crop(bounds)
            scale = 160/BODY[d][f]
            crop = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
            dx = round(160+(rect[0]+bounds[0]-CENTRES[d][f])*scale)
            dy = round(200+(rect[1]+bounds[1]-FEET[d])*scale)
            assert min(dx,dy)>=0 and dx+crop.width<=320 and dy+crop.height<=240,(d,f,dx,dy,crop.size)
            cell = Image.new('RGBA',(320,240))
            cell.alpha_composite(crop,(dx,dy))
            fn = f'attack-{DIRS[d]}-{f+1:02}.png'
            cell.save(frames/fn,optimize=True)
            sheet.alpha_composite(cell,(f*320,d*240))
            meta['cells'].append({'direction':DIRS[d],'frame':f,'source':'attack-motion-v2-transparent.png',
                'sourceRect':rect,'sourceFoot':[CENTRES[d][f],FEET[d]],'file':'attack-v2-frames/'+fn})
    sheet.save(OUT/'attack-v2.png',optimize=True)
    sheet.save(OUT/'attack-v2-preview.webp',quality=90,method=6)
    (OUT/'attack-v2-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 12 new attack poses; original attack.png preserved')

if __name__=='__main__': main()
