"""Pack original companion doll sheets; appearance only, no gameplay data."""
from pathlib import Path
import json,hashlib,statistics
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parent
GAME=ROOT.parents[3]
OUT=GAME/'images/sprites/dolls/companions-v1'
DIRS=['down','right','up']

def pack(item):
    source=ROOT/'sources'/(item['id']+'.png')
    im=Image.open(source).convert('RGBA')
    poses=[]
    for r in range(3):
        for c in range(4):
            rect=[round(c*im.width/4),round(r*im.height/3),round((c+1)*im.width/4),round((r+1)*im.height/3)]
            crop=im.crop(rect)
            alpha=crop.getchannel('A').point(lambda a:0 if a<24 else a)
            crop.putalpha(alpha)
            bb=alpha.point(lambda a:255 if a>120 else 0).getbbox()
            assert bb and (bb[2]-bb[0])*(bb[3]-bb[1])>500,(item['id'],r,c,'empty')
            full=alpha.getbbox()
            assert full,(item['id'],r,c)
            # The lower opaque band anchors feet; shared scale avoids frame-size jitter.
            band=alpha.crop((bb[0],max(bb[1],bb[3]-max(4,round((bb[3]-bb[1])*.1))),bb[2],bb[3]))
            pixels=band.load();xs=[x+bb[0] for y in range(band.height) for x in range(band.width) if pixels[x,y]>160]
            footx=statistics.median(xs) if xs else (bb[0]+bb[2])/2
            poses.append(dict(image=crop,rect=rect,bounds=full,core=bb,foot=[footx,bb[3]],r=r,c=c))
    scale=min(160/statistics.median(p['core'][3]-p['core'][1] for p in poses),
        218/max(p['bounds'][2]-p['bounds'][0] for p in poses),
        184/max(p['bounds'][3]-p['bounds'][1] for p in poses),
        118/max(max(1,p['foot'][0]-p['bounds'][0]) for p in poses),
        118/max(max(1,p['bounds'][2]-p['foot'][0]) for p in poses),
        188/max(max(1,p['foot'][1]-p['bounds'][1]) for p in poses),
        30/max(max(1,p['bounds'][3]-p['foot'][1]) for p in poses))
    dest=OUT/item['id'];dest.mkdir(parents=True,exist_ok=True)
    (dest/'frames').mkdir(exist_ok=True)
    sheet=Image.new('RGBA',(1024,720));cells=[];hashes=set()
    for p in poses:
        bb=p['bounds'];image=p['image'].crop(bb)
        image=image.resize((max(1,round(image.width*scale)),max(1,round(image.height*scale))),Image.Resampling.LANCZOS)
        x=round(128+(bb[0]-p['foot'][0])*scale);y=round(200+(bb[1]-p['foot'][1])*scale)
        assert x>0 and y>0 and x+image.width<256 and y+image.height<240,(item['id'],p['r'],p['c'],x,y,image.size)
        cell=Image.new('RGBA',(256,240));cell.alpha_composite(image,(x,y))
        digest=hashlib.sha256(cell.tobytes()).hexdigest()
        assert digest not in hashes,(item['id'],'duplicate pose')
        hashes.add(digest)
        file=f"frames/walk-{DIRS[p['r']]}-{p['c']+1:02}.png"
        cell.save(dest/file,optimize=True)
        sheet.alpha_composite(cell,(p['c']*256,p['r']*240))
        cells.append({'direction':DIRS[p['r']],'frame':p['c'],'file':file,'sourceRect':p['rect'],'sourceFoot':p['foot'],'scale':scale,'bounds':cell.getbbox()})
    sheet.save(dest/'walk.png',optimize=True)
    sheet.save(dest/'walk.webp',quality=88,method=6)
    sheet.resize((512,360),Image.Resampling.LANCZOS).save(dest/'contact.png')
    result={'id':item['id'],'name':item['name'],'quality':item['quality'],'effects':None,'status':'appearance-review',
        'cellW':256,'cellH':240,'charH':160,'drawH':24,'foot':[128,200],'rows':DIRS,'frames':4,'ms':145,
        'left':'mirror right','src':f"images/sprites/dolls/companions-v1/{item['id']}/walk.png",'cells':cells}
    (dest/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for p in cells:
        r=DIRS.index(p['direction']);c=p['frame']
        assert sheet.crop((c*256,r*240,(c+1)*256,(r+1)*240)).tobytes()==Image.open(dest/p['file']).convert('RGBA').tobytes()
    return result

def main():
    plan=json.loads((ROOT/'plan.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True,exist_ok=True)
    results=[];missing=[]
    for item in plan['dolls']:
        if not (ROOT/'sources'/(item['id']+'.png')).exists():missing.append(item['id']);continue
        results.append(pack(item));print('PASS',item['id'],'12 unique frames / alpha / margins / atlas correspondence')
    manifest={'status':'appearance-review','quality':None,'effects':None,'count':len(results),'expected':21,'missing':missing,'qualityTiers':plan['qualityTiers'],'dolls':results}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',20)
    contact=Image.new('RGB',(1260,((len(results)+6)//7)*220),'#1d2630');draw=ImageDraw.Draw(contact)
    for i,item in enumerate(results):
        x=(i%7)*180;y=(i//7)*220
        pose=Image.open(OUT/item['id']/'frames/walk-down-01.png').convert('RGBA')
        pose.thumbnail((180,169),Image.Resampling.LANCZOS)
        contact.paste(pose,(x,y+6),pose)
        draw.text((x+90,y+187),item['quality']+' '+item['name'],font=font,anchor='mm',fill='#f1e8d7')
    contact.save(OUT/'catalog.jpg',quality=94)
    print(f'Packed {len(results)}/21 dolls; missing: {missing}')

if __name__=='__main__':main()
