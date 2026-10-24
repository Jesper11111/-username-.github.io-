"""Pack independently generated poses; preserve original RGBA and record registration."""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import json
import hashlib
import runpy

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/shadow-pirate-gunner-v1'
DIRS = ['down', 'right', 'up']
MS = {'walk': 130, 'attack': 140, 'cast': 220, 'hit': 150}
CELL = (384, 320)
FOOT = (192, 270)
isolate = runpy.run_path(str(ROOT.parent/'sky-valkyrie-v1/prepare.py'))['isolate']


def source_name(direction):
    return direction + '-generated.png'


def source_rect(direction, i, w, h):
    row, col = divmod(i, 4)
    rows = {'down': [0,390,730,1086], 'right': [0,390,730,1086], 'up': [0,423,752,1086]}[direction]
    left, right = col*w/4, (col+1)*w/4
    if row == 1:
        left -= 24 if col else 0
        right += 48 if col < 3 else 0
    if direction == 'right' and i == 9:
        left, right = 380*w/1448, 815*w/1448
    return [max(0,round(left)),round(rows[row]*h/1086),min(w,round(right)),round(rows[row+1]*h/1086)]


def registration():
    result = {}
    for direction in DIRS:
        src = Image.open(ROOT / source_name(direction)).convert('RGBA')
        w, h = src.size
        result[direction] = []
        standing = []
        for i in range(12):
            row, col = divmod(i, 4)
            rect = source_rect(direction, i, w, h)
            rgba = np.array(isolate(src.crop(rect)))
            # Only opaque dark leather/boots, excluding red flames and bright blade effects.
            mask = (rgba[:, :, 3] > 180) & (rgba[:, :, :3].max(axis=2) < 155)
            ys, xs = np.nonzero(mask)
            assert len(xs) > 300, (direction, i)
            y0, y1 = int(ys.min()), int(ys.max())
            # Register the two-foot stance, not whichever single toe happens to be lowest.
            feet = xs[ys >= y1-(y1-y0)*0.20]
            fx = int(round((int(feet.min()) + int(feet.max()))/2))
            foot = [rect[0]+fx, rect[1]+y1+1]
            standing.append(y1-y0+1)
            result[direction].append({'rect': rect, 'foot': foot, 'body': 0})
        # Use the walk-row body height across every action, preserving deliberate crouch/recoil.
        body = float(np.median(standing[:4]))
        for cfg in result[direction]:
            cfg['body'] = body
    (ROOT/'registration.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    return result


def main():
    specs = json.loads((ROOT/'registration.json').read_text(encoding='utf-8')) if (ROOT/'registration.json').exists() else registration()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'frames').mkdir(exist_ok=True)
    manifest = {'id': 'shadow-pirate-gunner-v1', 'name': '暗影海盜雙槍客（紅變）', 'form': 'm06',
                'rows': DIRS, 'left': 'mirror right', 'cellW': 384, 'cellH': 320, 'footAnchor': list(FOOT),
                'charH': 160, 'drawH': 48, 'actions': {}}
    contact = Image.new('RGBA', (1536, 3840))
    hashes = set()
    audit = []
    for ai, action in enumerate(MS):
        n = 4 if action in ['walk', 'attack'] else 2
        sheet = Image.new('RGBA', (384*n, 960))
        meta = {'src': f'images/sprites/morph/shadow-pirate-gunner-v1/{action}.png', 'cellW': 384, 'cellH': 320,
                'frames': dict.fromkeys(DIRS, n), 'ms': MS[action], 'cells': []}
        for di, direction in enumerate(DIRS):
            src = Image.open(ROOT/source_name(direction)).convert('RGBA')
            for f in range(n):
                i = f if action == 'walk' else 4+f if action == 'attack' else 8+f if action == 'cast' else 10+f
                cfg = specs[direction][i]
                rect = cfg['rect']
                crop = isolate(src.crop(rect))
                bb = crop.getbbox()
                assert bb, (action, direction, f)
                scale = 160/cfg['body']
                crop = crop.crop(bb)
                crop = crop.resize((round(crop.width*scale), round(crop.height*scale)), Image.Resampling.LANCZOS)
                dx = round(FOOT[0]+(rect[0]+bb[0]-cfg['foot'][0])*scale)
                dy = round(FOOT[1]+(rect[1]+bb[1]-cfg['foot'][1])*scale)
                assert dx > 0 and dy > 0 and dx+crop.width < 384 and dy+crop.height < 320, (action, direction, f, dx, dy, crop.size)
                cell = Image.new('RGBA', CELL)
                cell.alpha_composite(crop, (dx, dy))
                digest = hashlib.sha256(cell.tobytes()).hexdigest()
                assert digest not in hashes, (action, direction, f)
                hashes.add(digest)
                filename = f'{action}-{direction}-{f+1:02}.png'
                cell.save(OUT/'frames'/filename, optimize=True)
                sheet.alpha_composite(cell, (f*384, di*320))
                contact.alpha_composite(cell, (f*384, (ai*3+di)*320))
                info = {'direction': direction, 'frame': f, 'file': 'frames/'+filename,
                        'source': source_name(direction), 'sourceRect': rect,
                        'sourceFoot': cfg['foot'], 'sourceBodyHeight': cfg['body']}
                meta['cells'].append(info)
                audit.append(dict(info, bounds=cell.getbbox()))
        sheet.save(OUT/(action+'.png'), optimize=True)
        sheet.save(OUT/(action+'-preview.avif'), quality=65, speed=6)
        manifest['actions'][action] = meta
    contact.resize((768, 1920), Image.Resampling.LANCZOS).save(OUT/'contact.png', optimize=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    for action, meta in manifest['actions'].items():
        sheet = Image.open(OUT/(action+'.png')).convert('RGBA')
        for c in meta['cells']:
            d, f = DIRS.index(c['direction']), c['frame']
            assert sheet.crop((f*384, d*320, (f+1)*384, (d+1)*320)).tobytes() == Image.open(OUT/c['file']).convert('RGBA').tobytes()
    print('PASS: 36 unique RGBA poses, transparent margins, consistent foot registration and exact atlas correspondence')


if __name__ == '__main__':
    main()
