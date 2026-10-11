# 屠龍勇者：職業立繪去背（創角舞台走出來用，ARCHITECTURE.md 第 18 節）。工作資料夾放 art/職業.jpg（＝images/classes/*.jpg）與 sam_b.pth；python3 artcut.py [職業…]
import numpy as np, cv2, torch, json
from PIL import Image, ImageFilter
from segment_anything import sam_model_registry, SamPredictor
torch.set_num_threads(8)
ks=[k for k in __import__('sys').argv[1:]] or ['royal','knight','mage','elf','darkelf','shura','warrior','gunner','magicfighter','paladin','angel','demon']
sam=sam_model_registry['vit_b'](checkpoint='sam_b.pth'); p=SamPredictor(sam)
import os; os.makedirs('artcut',exist_ok=True)
info={}
SPEC={
 'paladin':((180,0,780,536),[(480,90),(480,220),(480,330),(300,120),(660,120)],[(745,350),(720,450),(250,470),(700,500)]),
 'angel':((150,0,820,536),[(480,90),(480,220),(480,330),(300,120),(660,120)],[(480,510),(300,500),(680,500),(760,400)]),
 'gunner':((200,30,780,536),[(470,100),(470,220),(400,380),(560,380),(260,160),(700,160)],[(470,470),(330,500),(620,500)]),
 'magicfighter':((330,20,680,520),[(480,70),(480,180),(470,280),(380,420),(610,420)],[(300,80),(680,70),(250,300),(700,300),(500,440),(560,120),(360,500)]),
 'elf':((280,20,680,520),[(480,80),(475,180),(470,280),(460,400),(500,400),(320,240),(660,280),(580,400)],[(340,80),(620,60),(280,420),(700,450),(220,150),(740,150)]),
 'darkelf':((280,10,700,536),[(450,90),(450,200),(450,320),(460,420),(560,300),(330,420)],[(620,80),(200,250),(300,150),(800,300),(150,450),(750,450),(680,150)]),
 'shura':((410,30,600,520),[(462,180)],[],1),
 'magicfighter':((330,20,680,520),[(480,70),(480,180),(470,280),(380,420),(610,420)],[(300,80),(680,70),(250,300),(700,300),(500,440),(560,120)]),
 'demon':((90,20,900,520),[(470,100),(470,220),(470,350),(250,100),(720,100),(250,400)],[(850,300),(130,330),(830,330),(330,480),(620,480),(470,30)]),
}
for k in ks:
    im=cv2.imread(f'art/{k}.jpg'); H,W=im.shape[:2]
    # 底部金色標題：金色字＋暗色描邊，偵測後 inpaint
    roi=im[int(H*.78):,int(W*.3):int(W*.7)].astype(int); b,g,r=roi[...,0],roi[...,1],roi[...,2]
    gold=((r>150)&(g>100)&(r-b>60)).astype(np.uint8)
    n,lbl,st,_=cv2.connectedComponentsWithStats(gold,8)
    m=np.zeros_like(gold)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA]>=6: m[lbl==i]=1
    ys,xs=np.where(m); top=int(H*.78)+ys.min() if len(ys) else H
    full=np.zeros((H,W),np.uint8); full[int(H*.78):,int(W*.3):int(W*.7)]=cv2.dilate(m*255,np.ones((3,3),np.uint8),iterations=4)
    clean=cv2.inpaint(im,full,6,cv2.INPAINT_TELEA)
    rgb=cv2.cvtColor(clean,cv2.COLOR_BGR2RGB); p.set_image(rgb)
    cx=W//2
    sp=SPEC.get(k,((W*.2,0,W*.8,H),[(cx,int(H*.2)),(cx,int(H*.42)),(cx,int(H*.62))],[]))
    box,pos,neg=sp[:3]
    ms,sc,_=p.predict(point_coords=np.array(pos+neg,float),point_labels=np.array([1]*len(pos)+[0]*len(neg)),box=np.array(box,float),multimask_output=True)
    best=max(range(3),key=lambda i:(sum(ms[i][y,x] for x,y in pos)>=len(pos)-1,ms[i].sum()<W*H*.4,sc[i]))
    if len(sp)>3: best=sp[3]
    mk=ms[best].astype(np.uint8)
    n,lbl,st,_=cv2.connectedComponentsWithStats(mk,8)
    if n>1:
        big=st[1:,cv2.CC_STAT_AREA].max(); mk=np.isin(lbl,[i for i in range(1,n) if st[i,cv2.CC_STAT_AREA]>=big*.12]).astype(np.uint8)
    a=Image.fromarray(mk*255).filter(ImageFilter.GaussianBlur(1.2))
    # 標題那一段往下淡出（腳被字蓋住，補的地方比較糊）
    A=np.array(a).astype(float); fade0=top-20
    for y in range(max(0,fade0),H): A[y]*=max(0,1-(y-fade0)/max(1,(H-fade0)))
    out=Image.fromarray(rgb); out.putalpha(Image.fromarray(A.astype(np.uint8)))
    bb=out.getbbox(); out=out.crop(bb); out.save(f'artcut/{k}.png')
    info[k]=dict(bbox=list(map(int,bb)),score=round(float(sc[best]),3),textTop=int(top)); print(k,info[k])
json.dump(info,open('artcut/info.json','w'))
