"""Pack generated transparent sprites; preserves the source images unchanged."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[3]
OUT = PROJECT / 'images/sprites/morph/wolf-ranger-v1'
SPECS = {
    'walk': {'file': 'walk-generated-v2.png', 'cols': 4, 'body': [292,282,306], 'ms': 130},
    'attack': {'file': 'attack-generated-v2.png', 'cols': 4, 'body': [290,290,290], 'ms': 140},
    'cast': {'file': 'cast-generated-v2.png', 'cols': 2, 'body': [438,428,452], 'ms': 220},
    'hit': {'file': 'hit-generated-v2.png', 'cols': 2, 'body': [433,430,430], 'ms': 150},
}
DIRS = ['down', 'right', 'up']
ANCHORS = {
    'walk': [
        [[216,336],[590,336],[970,336],[1343,336]],
        [[215,648],[595,648],[978,648],[1370,648]],
        [[198,986],[582,984],[962,982],[1340,984]],
    ],
    'attack': [
        [[198,342],[584,342],[968,342],[1354,342]],
        [[200,678],[570,674],[970,674],[1365,678]],
        [[205,998],[586,1004],[970,1004],[1370,1004]],
    ],
    'cast': [[[277,496],[776,496]],[[274,982],[760,984]],[[275,1506],[771,1508]]],
    'hit': [[[289,510],[776,508]],[[302,990],[789,994]],[[284,1474],[775,1474]]],
}
CELL = (256,240)
FOOT = (128,200)
CHAR_H = 160

def components(mask):
    mask = mask.copy()
    h, w = mask.shape
    found = []
    for y, x in zip(*np.where(mask)):
        if not mask[y, x]:
            continue
        q = deque([(int(x), int(y))]); mask[y, x] = False
        points = []
        while q:
            px, py = q.popleft(); points.append((px, py))
            for nx, ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0 <= nx < w and 0 <= ny < h and mask[ny,nx]:
                    mask[ny,nx] = False; q.append((nx,ny))
        if len(points) > 15:
            a = np.array(points)
            found.append({'area': len(points), 'bbox': [int(a[:,0].min()*2), int(a[:,1].min()*2), int((a[:,0].max()+1)*2), int((a[:,1].max()+1)*2)], 'points': a})
    return found

def source_parts(im, cols):
    small = im.getchannel('A').resize((im.width//2, im.height//2), Image.Resampling.BOX)
    small = small.point(lambda a: 255 if a >= 32 else 0).filter(ImageFilter.MaxFilter(3))
    comps = components(np.array(small) > 0)
    major = [c for c in comps if c['area'] > 1500]
    major.sort(key=lambda c: (round(((c['bbox'][1]+c['bbox'][3])/2) / (im.height/3)-.5), c['bbox'][0]))
    assert len(major) == cols*3, f'Expected {cols*3} bodies, got {len(major)}'
    # Attach detached sparks to the nearest body; never cut across adjacent rows.
    for extra in [c for c in comps if c['area'] <= 1500]:
        ex,ey,x1,y1 = extra['bbox']; cx,cy = (ex+x1)/2,(ey+y1)/2
        def distance(c):
            x0,y0,x1,y1 = c['bbox']
            return max(x0-cx,0,cx-x1)**2 + max(y0-cy,0,cy-y1)**2
        owner = min(major,key=distance)
        if distance(owner) < 45**2:
            owner['points'] = np.concatenate([owner['points'], extra['points']])
    return major

def pack():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'frames').mkdir(exist_ok=True)
    manifest = {'id':'wolf-ranger-v1','name':'巡守妖魔神射（藍變）',
        'status':'review-assets-only; not connected to transformation gameplay',
        'rows':DIRS,'left':'mirror right','cellW':CELL[0],'cellH':CELL[1],
        'footAnchor':list(FOOT),'charH':CHAR_H,'drawH':48,'actions':{}}
    contact = Image.new('RGBA',(CELL[0]*4, CELL[1]*12),(0,0,0,0))
    audit = []
    for ai,(action,spec) in enumerate(SPECS.items()):
        im = Image.open(ROOT/spec['file']).convert('RGBA')
        assert im.getchannel('A').getextrema()[0] == 0, 'Missing real transparency'
        parts = source_parts(im,spec['cols'])
        sheet = Image.new('RGBA',(CELL[0]*spec['cols'],CELL[1]*3),(0,0,0,0))
        action_meta = {'src':f'images/sprites/morph/wolf-ranger-v1/{action}.png',
            'cellW':CELL[0],'cellH':CELL[1],'frames':dict.fromkeys(DIRS,spec['cols']),
            'ms':spec['ms'],'source':spec['file'],'sourceBodyHeight':spec['body'], 'cells':[]}
        for i,part in enumerate(parts):
            row,col = divmod(i,spec['cols'])
            mask = np.zeros((im.height//2,im.width//2),dtype=np.uint8)
            pp = part['points']; mask[pp[:,1],pp[:,0]] = 255
            keep = Image.fromarray(mask).resize(im.size,Image.Resampling.NEAREST).filter(ImageFilter.MaxFilter(17))
            rgba = np.array(im)
            rgba[:,:,3] = np.where(np.array(keep)>0, rgba[:,:,3], 0)
            rgba[rgba[:,:,3] <= 8] = 0
            isolated = Image.fromarray(rgba)
            bbox = isolated.getbbox(); assert bbox
            ax,ay = ANCHORS[action][row][col]
            scale = CHAR_H/spec['body'][row]
            sprite = isolated.crop(bbox)
            sprite = sprite.resize((round(sprite.width*scale),round(sprite.height*scale)),Image.Resampling.LANCZOS)
            dx,dy = round(FOOT[0]+(bbox[0]-ax)*scale),round(FOOT[1]+(bbox[1]-ay)*scale)
            assert dx>=2 and dy>=2 and dx+sprite.width<=CELL[0]-2 and dy+sprite.height<=CELL[1]-2, (action,row,col,dx,dy,sprite.size)
            cell = Image.new('RGBA',CELL,(0,0,0,0)); cell.alpha_composite(sprite,(dx,dy))
            name = f'{action}-{DIRS[row]}-{col+1:02}.png'
            cell.save(OUT/'frames'/name,optimize=True)
            sheet.alpha_composite(cell,(col*CELL[0],row*CELL[1]))
            contact.alpha_composite(cell,(col*CELL[0],(ai*3+row)*CELL[1]))
            action_meta['cells'].append({'direction':DIRS[row],'frame':col,'sourceRect':list(bbox),'sourceFoot':[ax,ay], 'file':'frames/'+name})
            audit.append({'action':action,'dir':DIRS[row],'frame':col,'bounds':cell.getbbox()})
        sheet.save(OUT/f'{action}.png',optimize=True)
        sheet.save(OUT/f'{action}-preview.webp',quality=88,method=6)
        manifest['actions'][action] = action_meta
    contact.save(OUT/'contact.png',optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
    print(f'Packed {len(audit)} RGBA frames into {OUT}')
    return manifest

if __name__ == '__main__':
    pack()
