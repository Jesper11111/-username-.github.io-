"""Crop the supplied animation after image_gen background extraction."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/moon-ranger-v1'
CELL = (320,240)
FOOT = (160,200)
DIRS = ['down','right','up']
MS = {'walk':130,'attack':140,'cast':220,'hit':150}
BODY = {'walk':[146,142,142], 'attack':[142,142,142], 'cast':[138,142,142], 'hit':[141,137,140]}
# Entries: source rectangle (left,top,right,bottom), body horizontal centre, foot Y.
ROWS = [
    [([50,65,265,239],148,237),([285,65,505,239],382,237),([520,65,745,239],623,237),([755,65,988,239],853,237),([1000,55,1220,242],1087,237),([1230,55,1435,242],1321,237)],
    [([40,239,280,411],142,407),([280,239,522,411],373,407),([525,239,742,413],621,407),([748,237,989,413],850,407),([1010,246,1215,411],1091,407),([1225,246,1425,411],1327,407)],
    [([45,414,265,564],147,560),([285,414,505,564],385,560),([520,414,745,564],625,560),([755,414,988,564],856,560),([1010,403,1215,564],1095,560),([1230,403,1435,564],1325,560)],
    [([45,550,278,719],142,714),([282,550,523,719],373,714),([525,551,742,720],619,714),([748,543,990,720],850,714),([1010,567,1215,719],1098,714),([1230,567,1435,719],1331,714)],
    [([45,722,278,874],149,872),([285,722,523,874],388,872),([520,722,745,875],626,872),([755,722,990,875],863,872),([1010,697,1220,877],1092,872),([1230,697,1435,877],1326,872)],
    [([40,874,285,1035],142,1026),([285,874,525,1035],376,1026),([525,873,745,1038],621,1028),([748,873,995,1040],854,1028),([1010,879,1220,1040],1093,1030),([1230,879,1435,1040],1329,1032)],
]
MAP = {
    'walk': [[(r,c) for c in range(4)] for r in [0,4,2]],
    'attack': [[(r,4),(r,5),(r+1,0),(r+1,1)] for r in [0,4,2]],
    'cast': [[(r,2),(r,3)] for r in [1,5,3]],
    'hit': [[(r,4),(r,5)] for r in [1,5,3]],
}

def isolate(crop):
    # Use opaque structure to distinguish a neighbour from this cell's soft glow.
    alpha = np.array(crop.getchannel('A'))
    work = alpha >= 160
    h,w = work.shape
    comps=[]
    for y,x in zip(*np.where(work)):
        if not work[y,x]: continue
        q=deque([(int(x),int(y))]); work[y,x]=False; points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and work[ny,nx]:
                    work[ny,nx]=False;q.append((nx,ny))
        comps.append(points)
    comps.sort(key=len,reverse=True)
    assert comps and len(comps[0])>1000
    keep=np.zeros((h,w),dtype=np.uint8)
    for points in comps:
        if len(points)<max(12,len(comps[0])*.012): continue
        a=np.array(points); cx,cy=a.mean(axis=0)
        # Only substantial body/effect pieces; tiny neighbouring feet are excluded
        # by the component expansion below rather than the crop box alone.
        if len(points)<len(comps[0])*.12 and (cy<12 or cy>h-18): continue
        keep[a[:,1],a[:,0]]=255
    keep=Image.fromarray(keep).filter(ImageFilter.MaxFilter(9))
    rgba=np.array(crop);rgba[:,:,3]=np.where(np.array(keep)>0,alpha,0)
    rgba[rgba[:,:,3]<=8]=0
    return Image.fromarray(rgba)

def main():
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    src=Image.open(ROOT/'sheet-transparent.png').convert('RGBA')
    assert src.getchannel('A').getextrema()==(0,255)
    manifest={'id':'moon-ranger-v1','name':'月光精靈巡林者（紅變）',
        'status':'appearance-preview-only','level':None,'effects':None,
        'rows':DIRS,'left':'mirror right','cellW':320,'cellH':240,
        'charH':160,'drawH':48,'footAnchor':list(FOOT),'actions':{}}
    contact=Image.new('RGBA',(1280,2880))
    for ai,(action,rows) in enumerate(MAP.items()):
        n=len(rows[0]);sheet=Image.new('RGBA',(n*320,720))
        meta={'src':f'images/sprites/morph/moon-ranger-v1/{action}.png',
            'cellW':320,'cellH':240,'frames':dict.fromkeys(DIRS,n),'ms':MS[action],'cells':[]}
        for d,row in enumerate(rows):
            for f,(sr,sc) in enumerate(row):
                rect,ax,ay=ROWS[sr][sc];x0,y0,x1,y1=rect
                source_name='sheet-transparent.png'
                body=BODY[action][d]
                source=src
                if action=='attack' and d==1 and f>=2:
                    source_name='bow-repair-generated.png'
                    source=Image.open(ROOT/source_name).convert('RGBA')
                    rect=([210,35,1024,740] if f==2 else [1160,35,2048,740])
                    ax,ay=(550 if f==2 else 1503),698
                    x0,y0,x1,y1=rect;body=522
                crop=isolate(source.crop(rect))
                bounds=crop.getbbox();assert bounds
                crop=crop.crop(bounds);x0+=bounds[0];y0+=bounds[1]
                scale=160/body
                crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
                dx,dy=round(160+(x0-ax)*scale),round(200+(y0-ay)*scale)
                assert dx>=0 and dy>=0 and dx+crop.width<=320 and dy+crop.height<=240,(action,d,f,dx,dy,crop.size)
                cell=Image.new('RGBA',CELL);cell.alpha_composite(crop,(dx,dy))
                fn=f'{action}-{DIRS[d]}-{f+1:02}.png'
                cell.save(OUT/'frames'/fn,optimize=True)
                sheet.alpha_composite(cell,(f*320,d*240))
                contact.alpha_composite(cell,(f*320,(ai*3+d)*240))
                meta['cells'].append({'direction':DIRS[d],'frame':f,'sourceCell':[sr,sc],
                    'source':source_name,'sourceRect':rect,'sourceFoot':[ax,ay],'file':'frames/'+fn})
        sheet.save(OUT/(action+'.png'),optimize=True)
        sheet.save(OUT/(action+'-preview.webp'),quality=90,method=6)
        manifest['actions'][action]=meta
    contact.save(OUT/'contact.png',optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 36 transparent frames; appearance and preview only')

if __name__=='__main__': main()
