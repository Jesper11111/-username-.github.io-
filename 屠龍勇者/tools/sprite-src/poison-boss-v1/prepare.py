"""Prepare generated poison art without replacing the original sources."""
from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parent
GAME=ROOT.parents[2]
audit=[]
def fit(source,size,box):
    im=Image.open(ROOT/source).convert('RGBA')
    im.thumbnail(box,Image.Resampling.LANCZOS)
    out=Image.new('RGBA',size)
    out.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
    bb=out.getbbox();assert bb and bb[0]>0 and bb[1]>0 and bb[2]<size[0] and bb[3]<size[1]
    audit.append({'source':source,'size':size,'alphaBounds':bb})
    return out
for source,name in [('material-source.png','spiderVenom-v1'),('soul-source.png','soul_spiderVenom-v1')]:
    fit(source,(128,128),(112,112)).save(GAME/'images/icons/items'/f'{name}.png',optimize=True)
# Static boss model uses the existing single-pose monster protocol (six facing/action rows).
# This is one illustration in each row, not newly drawn animation frames.
boss=fit('boss-source.png',(256,224),(236,180))
sheet=Image.new('RGBA',(256,224*6))
for row in range(6):sheet.alpha_composite(boss,(0,row*224))
sheet.save(GAME/'images/monsters/venomQueen.png',optimize=True)
src=Image.open(ROOT/'vfx-source.png').convert('RGBA')
atlas=Image.new('RGBA',(1024,1024))
for i in range(16):
    row,col=divmod(i,4)
    rect=(round(col*src.width/4),round(row*src.height/4),round((col+1)*src.width/4),round((row+1)*src.height/4))
    cell=src.crop(rect);cell.thumbnail((224,224),Image.Resampling.LANCZOS)
    atlas.alpha_composite(cell,(col*256+(256-cell.width)//2,row*256+(256-cell.height)//2))
atlas.save(GAME/'images/vfx/venom-burst-v1.png',optimize=True)
(ROOT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: original RGBA preserved; 128px icons, six-row static boss and 4x4 poison VFX packed')
