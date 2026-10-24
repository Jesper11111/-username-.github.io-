"""Compose the packed game frames into a four-direction animated review sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3]/'images/sprites/morph/shadow-pirate-gunner-v1'
FONT = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 16)
ACTIONS = [('walk', 4, 130, '走路'), ('attack', 4, 140, '攻擊'), ('cast', 2, 220, '施法'), ('hit', 2, 150, '受傷')]
DIRS = [('down', '正面'), ('right', '右向'), ('up', '背面'), ('left', '左向')]
frames = []
for t in range(0, 2240, 80):
    canvas = Image.new('RGB', (768, 780), '#20262b')
    draw = ImageDraw.Draw(canvas)
    for col, (direction, label) in enumerate(DIRS):
        draw.text((col*192+72, 8), label, font=FONT, fill='#d9dce1')
        for row, (action, n, ms, name) in enumerate(ACTIONS):
            f = (t//ms) % n + 1
            d = 'right' if direction == 'left' else direction
            sprite = Image.open(OUT/'frames'/f'{action}-{d}-{f:02}.png').convert('RGBA')
            if direction == 'left':
                sprite = ImageOps.mirror(sprite)
            sprite = sprite.resize((192, 160), Image.Resampling.LANCZOS)
            x, y = col*192, 32+row*186
            draw.line((x+50, y+135, x+142, y+135), fill='#505b63')
            canvas.paste(sprite, (x, y), sprite)
            draw.text((x+78, y+162), name, font=FONT, fill='#c5cbd1')
    frames.append(canvas)
frames[0].save(OUT/'motion-preview.gif', save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=True)
print('Saved four-direction motion-preview.gif')
