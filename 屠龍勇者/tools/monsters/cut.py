import sys, json, numpy as np
from collections import deque
from PIL import Image, ImageFilter
sys.path.insert(0,'.')
from spec import SPEC, FLIP
sheet=Image.open('sheet.jpg').convert('RGB')
def cut(b):
    x,y,w,h=b; im=sheet.crop((x+3,y+3,x+w-3,y+h-3)); a=np.array(im).astype(int); H,W=a.shape[:2]
    white=(a.min(2)>=222)&((a.max(2)-a.min(2))<=22)
    bg=np.zeros((H,W),bool); q=deque()
    for i in range(W):
        for j in (0,H-1):
            if white[j,i] and not bg[j,i]: bg[j,i]=True; q.append((j,i))
    for j in range(H):
        for i in (0,W-1):
            if white[j,i] and not bg[j,i]: bg[j,i]=True; q.append((j,i))
    while q:
        j,i=q.popleft()
        for jj,ii in ((j+1,i),(j-1,i),(j,i+1),(j,i-1)):
            if 0<=jj<H and 0<=ii<W and not bg[jj,ii] and white[jj,ii]: bg[jj,ii]=True; q.append((jj,ii))
    # 被手臂、翅膀圍住的白色空隙也是背景
    import cv2
    loose=(a.min(2)>=205)&((a.max(2)-a.min(2))<=26)
    n,lbl,st,_=cv2.connectedComponentsWithStats((loose&~bg).astype(np.uint8),connectivity=4)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA]>=5: bg[lbl==i]=True
    # 淡淡的地面陰影、白邊：靠背景、偏亮的點給半透明
    lum=a.mean(2); alpha=np.where(bg,0,255).astype(float)
    near=np.array(Image.fromarray((bg*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)))>0
    edge=near&~bg
    alpha[edge]=np.clip((255-lum[edge])*255/70,0,255)
    out=np.dstack([a,alpha]).astype(np.uint8); img=Image.fromarray(out,'RGBA')
    if (x,y) in FLIP: img=img.transpose(Image.FLIP_LEFT_RIGHT)
    return img
meta={}
for k,v in SPEC.items():
    cells={}
    for row in ('walk','attack'):
        for di,b in enumerate(v[row]):
            src=b or v[row][0]
            cells[(row,di)]=cut(src)
    # 對齊：腳底＝不透明最下緣，水平＝內容中心；全部同尺寸
    boxes={kk:im.getbbox() for kk,im in cells.items()}
    L=max((bb[2]-bb[0]) for bb in boxes.values()); Hh=max((bb[3]-bb[1]) for bb in boxes.values())
    cw,ch=L+4,Hh+4
    out=Image.new('RGBA',(cw*3,ch*2),(0,0,0,0))
    for (row,di),im in cells.items():
        bb=boxes[(row,di)]; c=im.crop(bb)
        r=0 if row=='walk' else 1
        out.paste(c,(di*cw+(cw-c.width)//2, r*ch+ch-2-c.height),c)
    out.save(f'out/{k}.png',optimize=True)
    wb=boxes[('walk',0)]
    meta[k]={'cw':cw,'ch':ch,'body':wb[3]-wb[1]}
json.dump(meta,open('out/meta.json','w'))
print(json.dumps(meta))
