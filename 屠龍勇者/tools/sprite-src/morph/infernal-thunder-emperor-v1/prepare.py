"""Pack the generated 4 x 9 transparent pose sheet; never modify source art."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import json
import hashlib
import importlib.util
from PIL import Image
import numpy as np

spec = importlib.util.spec_from_file_location('morph_pack', Path(__file__).resolve().parent.parent / 'sky-valkyrie-v1/prepare.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/infernal-thunder-emperor-v1'
DIRS = ['down', 'right', 'up']
MS = {'walk': 130, 'attack': 140, 'cast': 220, 'hit': 150}

def main():
    src = Image.open(ROOT / 'sheet-transparent.png').convert('RGBA')
    registration = json.loads((ROOT / 'registration.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'frames').mkdir(exist_ok=True)
    manifest = {'id': 'infernal-thunder-emperor-v1', 'name': '煉獄雷霆魔皇', 'form': 'm31',
        'rows': DIRS, 'left': 'mirror right', 'cellW': 384, 'cellH': 320,
        'footAnchor': [192, 270], 'charH': 160, 'drawH': 48, 'actions': {}}
    hashes = set()
    for action, ms in MS.items():
        n = 4 if action in ['walk', 'attack'] else 2
        sheet = Image.new('RGBA', (384*n, 960))
        meta = {'src': f'images/sprites/morph/infernal-thunder-emperor-v1/{action}.png',
            'cellW': 384, 'cellH': 320, 'frames': dict.fromkeys(DIRS, n), 'ms': ms, 'cells': []}
        for d, direction in enumerate(DIRS):
            for f in range(n):
                row = d*3 + (0 if action == 'walk' else 1 if action == 'attack' else 2)
                col = f + (2 if action == 'hit' else 0)
                cfg = registration[row*4+col]
                rect, foot, body = cfg['rect'], cfg['foot'], cfg['body']
                crop = helper.isolate(src.crop(rect))
                bb = crop.getbbox()
                assert bb, (row, col)
                scale = 160/body
                image = crop.crop(bb)
                image = image.resize((round(image.width*scale), round(image.height*scale)), Image.Resampling.LANCZOS)
                x = round(192 + (rect[0]+bb[0]-foot[0])*scale)
                y = round(270 + (rect[1]+bb[1]-foot[1])*scale)
                assert x > 0 and y > 0 and x+image.width < 384 and y+image.height < 320, (row,col,x,y,image.size)
                cell = Image.new('RGBA', (384,320))
                cell.alpha_composite(image, (x,y))
                digest = hashlib.sha256(cell.tobytes()).hexdigest()
                assert digest not in hashes, (action,d,f)
                hashes.add(digest)
                file = f'frames/{action}-{direction}-{f+1:02}.png'
                cell.save(OUT / file, optimize=True)
                sheet.alpha_composite(cell, (384*f,320*d))
                meta['cells'].append({'direction':direction,'frame':f,'file':file,'sourceRect':rect,'sourceFoot':foot,'sourceBodyHeight':body})
        sheet.save(OUT / (action+'.png'), optimize=True)
        sheet.save(OUT / (action+'-preview.webp'), quality=85, method=6)
        sheet.resize((192*n,480)).save(OUT / (action+'-contact.png'))
        manifest['actions'][action] = meta
    (OUT / 'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assert len(hashes) == 36
    print('PASS: 36 distinct transparent frames, shared foot registration, 4 atlases')

if __name__ == '__main__':
    main()
