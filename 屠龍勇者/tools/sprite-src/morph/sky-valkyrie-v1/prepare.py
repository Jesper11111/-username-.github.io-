"""Register generated full-body keyframes, preserving source art and alpha."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[3]/'images/sprites/morph/sky-valkyrie-v1'
DIRS=['down','right','up']
CELL=(384,320)
FOOT=(192,270)
MS={'walk':80,'attack':70,'cast':110,'hit':80}

def isolate(crop):
    alpha=np.array(crop.getchannel('A'))
    work=alpha>=128
    h,w=work.shape
    largest=[]
    for y,x in zip(*np.where(work)):
        if not work[y,x]:continue
        q=deque([(int(x),int(y))]);work[y,x]=False;points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and work[ny,nx]:
                    work[ny,nx]=False;q.append((nx,ny))
        if len(points)>len(largest):largest=points
    assert len(largest)>1000
    keep=np.zeros((h,w),dtype=np.uint8)
    points=np.array(largest);keep[points[:,1],points[:,0]]=255
    keep=np.array(Image.fromarray(keep).filter(ImageFilter.MaxFilter(13)))
    rgba=np.array(crop);rgba[:,:,3]=np.where((keep>0)&(alpha>8),alpha,0)
    rgba[rgba[:,:,3]==0]=0
    return Image.fromarray(rgba)

def place(src,rect,anchor,body,cell=CELL,foot=FOOT):
    crop=isolate(src.crop(rect));bb=crop.getbbox();assert bb
    crop=crop.crop(bb);scale=160/body
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    dx=round(foot[0]+(rect[0]+bb[0]-anchor[0])*scale)
    dy=round(foot[1]+(rect[1]+bb[1]-anchor[1])*scale)
    assert dx>0 and dy>0 and dx+crop.width<cell[0] and dy+crop.height<cell[1],(rect,anchor,body,dx,dy,crop.size)
    out=Image.new('RGBA',cell);out.alpha_composite(crop,(dx,dy));return out

def source_cell(action,d,f,cache):
    if action=='walk':
        fn='walk-'+DIRS[d]+'-generated.png';src=cache[fn]
        r,c=divmod(f,4);w,h=src.size;cw,ch=w/4,h/2
        rect=[round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch)]
        xs=[[211,657,1110,1550],[244,686,1130,1570],[234,668,1111,1558]][d]
        ys=[[435,861],[458,871],[447,865]][d]
        anchor=[xs[c],ys[r]];body=[367,335,346][d]
    elif action=='attack':
        fn='attack-generated.png';src=cache[fn];r=d*2+f//4;c=f%4
        ys=[0,252,495,734,972,1205,1448]
        rect=[round(c*src.width/4),ys[r],round((c+1)*src.width/4),ys[r+1]]
        anchor=[[132,391,661,944][c],[249,492,728,966,1200,1430][r]]
        body=[205,207,202,202,192,192][r]
    else:
        fn=action+'-generated.png';src=cache[fn];r=d;c=f
        w,h=src.size
        rect=[round(c*w/4),round(r*h/3),round((c+1)*w/4),round((r+1)*h/3)]
        if action=='cast':
            xs=[[184,580,958,1345],[205,590,970,1353],[209,590,976,1359]][d]
            anchor=[xs[c],[334,671,1007][d]];body=265
        else:
            xs=[[207,584,961,1360],[211,590,975,1365],[212,595,981,1375]][d]
            anchor=[xs[c],[351,685,1007][d]];body=[280,275,275][d]
    return src,fn,rect,anchor,body

def main():
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    files=['walk-'+d+'-generated.png' for d in DIRS]+[a+'-generated.png' for a in ['attack','cast','hit']]
    cache={fn:Image.open(ROOT/fn).convert('RGBA') for fn in files}
    manifest={'id':'sky-valkyrie-v1','name':'蒼穹女武神・艾爾（神話）','status':'appearance-preview-only',
        'level':None,'effects':None,'rows':DIRS,'left':'mirror right','cellW':384,'cellH':320,
        'footAnchor':list(FOOT),'charH':160,'drawH':48,'actions':{}}
    audit=[]
    for action in MS:
        n=8 if action in ['walk','attack'] else 4
        sheet=Image.new('RGBA',(n*CELL[0],3*CELL[1]))
        meta={'src':f'images/sprites/morph/sky-valkyrie-v1/{action}.png','cellW':CELL[0],'cellH':CELL[1],
            'frames':dict.fromkeys(DIRS,n),'ms':MS[action],'cells':[]}
        for d in range(3):
            for f in range(n):
                src,fn,rect,anchor,body=source_cell(action,d,f,cache)
                cell=place(src,rect,anchor,body)
                name=f'{action}-{DIRS[d]}-{f+1:02}.png';cell.save(OUT/'frames'/name,optimize=True)
                sheet.alpha_composite(cell,(f*CELL[0],d*CELL[1]))
                info={'direction':DIRS[d],'frame':f,'source':fn,'sourceRect':rect,'sourceFoot':anchor,'sourceBodyHeight':body,'file':'frames/'+name}
                meta['cells'].append(info);audit.append(dict(info,bounds=cell.getbbox()))
        sheet.save(OUT/(action+'.png'),optimize=True)
        sheet.save(OUT/(action+'-preview.avif'),quality=60,speed=6)
        sheet.resize((n*256,3*round(320*2/3)),Image.Resampling.LANCZOS).save(OUT/(action+'-preview.webp'),quality=76,method=6)
        sheet.resize((n*192,480),Image.Resampling.LANCZOS).save(OUT/(action+'-contact.png'),optimize=True)
        manifest['actions'][action]=meta
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packed 72 original transparent poses')

if __name__=='__main__':main()
