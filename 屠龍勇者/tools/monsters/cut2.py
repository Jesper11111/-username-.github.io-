import sys, json, numpy as np, cv2
from collections import deque
from PIL import Image, ImageFilter
sys.path.insert(0, '.')
from spec2 import SPEC, FLIP
try:
    from spec2 import NORM
except ImportError:
    NORM = set()
SHEETS = {k: Image.open(f'{k}.jpg').convert('RGB') for k in ('S1', 'A', 'B', 'C', 'D', 'E', 'F')}
def cut(box):
    sh, x0, y0, x1, y1 = box
    a = np.array(SHEETS[sh].crop((x0, y0, x1, y1))).astype(int); H, W = a.shape[:2]
    white = (a.min(2) >= 222) & ((a.max(2) - a.min(2)) <= 22)
    bg = np.zeros((H, W), bool); q = deque()
    for i in range(W):
        for j in (0, H - 1):
            if white[j, i]: bg[j, i] = True; q.append((j, i))
    for j in range(H):
        for i in (0, W - 1):
            if white[j, i] and not bg[j, i]: bg[j, i] = True; q.append((j, i))
    while q:
        j, i = q.popleft()
        for jj, ii in ((j + 1, i), (j - 1, i), (j, i + 1), (j, i - 1)):
            if 0 <= jj < H and 0 <= ii < W and not bg[jj, ii] and white[jj, ii]: bg[jj, ii] = True; q.append((jj, ii))
    loose = (a.min(2) >= 205) & ((a.max(2) - a.min(2)) <= 26)
    n, lbl, st, _ = cv2.connectedComponentsWithStats((loose & ~bg).astype(np.uint8), connectivity=4)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= 5: bg[lbl == i] = True
    # 只留主體（最大塊＋面積 ≥ 15% 的塊），去掉隔壁格伸進來的東西、格線殘渣
    n, lbl, st, _ = cv2.connectedComponentsWithStats((~bg).astype(np.uint8), connectivity=8)
    if n > 1:
        big = st[1:, cv2.CC_STAT_AREA].max()
        keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= big * 0.15]
        bg |= ~np.isin(lbl, keep)
    lum = a.mean(2); alpha = np.where(bg, 0, 255).astype(float)
    near = np.array(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
    e = near & ~bg; alpha[e] = np.clip((255 - lum[e]) * 255 / 70, 0, 255)
    img = Image.fromarray(np.dstack([a, alpha]).astype(np.uint8), 'RGBA')
    if (sh, x0, y0) in FLIP: img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img if img.getbbox() else None
meta = {}
only = sys.argv[1:]
for k, v in SPEC.items():
    if only and k not in only: continue
    rows = []   # walk down/right/up, attack down/right/up
    for anim in ('walk', 'attack'):
        dirs = v[anim]
        for d in range(3):
            boxes = dirs[d] if d < len(dirs) and dirs[d] else dirs[0]
            fr = [c for c in (cut(b) for b in boxes) if c]
            rows.append(fr)
    if k in NORM:   # 攻擊列放大到和走路列同高
        med = lambda rs: sorted(im.getbbox()[3] - im.getbbox()[1] for r in rs for im in r)[sum(len(r) for r in rs) // 2]
        f = med(rows[:3]) / med(rows[3:])
        rows = rows[:3] + [[im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS) for im in r] for r in rows[3:]]
    bbs = [im.getbbox() for r in rows for im in r]
    cw = max(b[2] - b[0] for b in bbs) + 4; ch = max(b[3] - b[1] for b in bbs) + 4
    cols = max(len(r) for r in rows)
    out = Image.new('RGBA', (cw * cols, ch * 6), (0, 0, 0, 0))
    for ri, r in enumerate(rows):
        for ci, im in enumerate(r):
            c = im.crop(im.getbbox()); out.paste(c, (ci * cw + (cw - c.width) // 2, ri * ch + ch - 2 - c.height), c)
    out.save(f'out/{k}.png', optimize=True)
    b0 = rows[0][0].getbbox()
    meta[k] = {'cw': cw, 'ch': ch, 'body': b0[3] - b0[1], 'n': [len(r) for r in rows]}
json.dump(meta, open('out/meta.json', 'w'))
for k, m in meta.items(): print(k, m)
