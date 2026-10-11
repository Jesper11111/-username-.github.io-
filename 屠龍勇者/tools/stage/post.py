# 屠龍勇者：創角舞台去背（ARCHITECTURE.md 第 18 節）。在工作資料夾執行，順序 clean.py → seg.py → post.py；需要 src.jpg（＝tools/sprite-src/all-classes.jpg）、sam_b.pth（SAM vit_b 權重）、NotoSansTC.otf
import numpy as np, cv2, json
from PIL import Image, ImageFilter
d=dict(np.load('masks.npz'))
order=['mage','knight','royal','darkelf','magicfighter','gunner','elf','paladin','angel','shura','warrior','demon']
d['mage']&=~d['magicfighter']
d['warrior'][840:,:]=False   # 戰士下半身被王族擋住，下面只剩法杖碎片   # 法師左上角那塊是魔鬥士的腳
taken=np.zeros_like(d['mage'])
H,W=taken.shape
for k in order:
    m=(d[k]&~taken).astype(np.uint8)
    n,lbl,st,_=cv2.connectedComponentsWithStats(m,8)
    if n>1:
        big=st[1:,cv2.CC_STAT_AREA].max()
        m=np.isin(lbl,[i for i in range(1,n) if st[i,cv2.CC_STAT_AREA]>=big*0.04]).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    d[k]=m.astype(bool); taken|=d[k]
# 全部標籤擦掉的版本（只給剪影用）
im=cv2.imread('labeled.png'); lm=np.zeros((H,W),np.uint8)
for (a,b,c,e) in [(410,280,520,330),(640,295,790,340),(950,215,1060,265),(1190,295,1300,340),(1460,265,1570,310),(170,1150,300,1215),(1690,1205,1890,1270),(1500,1205,1640,1270),(500,1270,620,1330),(700,1210,820,1260),(1320,1355,1440,1405),(1260,735,1380,790)]:
    roi=im[b:e,a:c].astype(int); t=((roi.sum(2)/3>120)&(roi[...,2]>=roi[...,0])).astype(np.uint8)*255
    lm[b:e,a:c]=cv2.dilate(t,np.ones((3,3),np.uint8),iterations=3)
cv2.imwrite('nolabel.png',cv2.inpaint(im,lm,7,cv2.INPAINT_TELEA))
src=Image.open('nolabel.png').convert('RGB')
meta={}
import os; os.makedirs('cut',exist_ok=True)
for k in order:
    m=d[k]; ys,xs=np.where(m); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    a=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba=src.copy(); rgba.putalpha(a); c=rgba.crop((x0,y0,x1,y1))
    c.save(f'cut/{k}.png')
    meta[k]=[int(x0),int(y0),int(x1),int(y1)]
json.dump(meta,open('cut/meta.json','w'))
print(meta)
