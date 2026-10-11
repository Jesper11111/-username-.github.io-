# 屠龍勇者：創角舞台去背（ARCHITECTURE.md 第 18 節）。在工作資料夾執行，順序 clean.py → seg.py → post.py；需要 src.jpg（＝tools/sprite-src/all-classes.jpg）、sam_b.pth（SAM vit_b 權重）、NotoSansTC.otf
import numpy as np, torch, cv2
from PIL import Image
from segment_anything import sam_model_registry, SamPredictor
torch.set_num_threads(8)
# 每個職業：多組 (box, 正向點, 反向點)，結果取聯集
G={
 'elf':   [((40,480,400,1170),[(210,600),(220,750),(230,1000),(100,560),(200,1120)],[(480,900),(420,600),(75,470),(80,520),(90,1100),(130,1150),(60,700)])],
 'angel': [((330,250,560,1000),[(450,380),(450,550),(450,750)],[(720,520),(530,780),(220,700)]),
           ((180,170,700,560),[(300,300),(600,280),(450,380)],[(720,450)])],
 'paladin':[((600,340,830,1010),[(730,410),(730,520),(730,900)],[(450,520),(530,700),(850,800),(640,900),(640,960),(600,1000)])],
 'knight':[((330,630,760,1300),[(535,700),(530,820),(640,900),(520,1150),(420,1000)],[(230,800),(820,900),(730,550),(720,640),(730,600)])],
 'gunner':[((690,640,960,1250),[(820,700),(820,830),(830,1100)],[(640,900),(1130,850),(930,600),(720,1000),(700,1050)])],
 'demon': [((850,230,1130,1080),[(1000,350),(1000,480),(990,620)],[(1240,500),(820,800),(1150,850),(950,700),(930,760)]),
           ((680,140,1180,560),[(800,300),(1150,250),(1000,350)],[(1240,500)])],
 'shura': [((1110,320,1420,980),[(1240,400),(1240,520),(1300,850),(1290,950)],[(1000,480),(1500,500),(1150,800),(1130,710),(1150,880),(1220,780),(1100,1000)])],
 'warrior':[((1320,240,1700,1150),[(1500,380),(1500,520),(1500,650),(1600,280),(1450,1050)],[(1560,820),(1240,500),(1780,800),(1560,690),(1560,640),(1600,900),(1520,1000),(1560,1150)])],
 'royal': [((1420,600,1720,1260),[(1560,690),(1560,850),(1560,1150)],[(1450,500),(1780,900),(1380,1100),(1500,620),(1430,850),(1450,1250),(1420,1000)])],
 'darkelf':[((1690,590,1960,1260),[(1780,650),(1790,850),(1790,1150)],[(1600,900),(1700,1000),(1690,800),(1700,1150)])],
 'mage':  [((1150,880,1650,1420),[(1370,940),(1380,1150),(1500,1300)],[(1150,850),(1580,1000),(1200,900),(1180,1000),(1600,1200)])],
 'magicfighter':[((1020,650,1340,1200),[(1130,710),(1150,820),(1100,1050)],[(1380,1150),(1240,520),(980,500),(820,850)])],
}
img=np.array(Image.open('nolabel.png').convert('RGB')); H,W=img.shape[:2]
sam=sam_model_registry['vit_b'](checkpoint='sam_b.pth'); p=SamPredictor(sam)
# 標籤文字遮罩（亮米色字）不算角色
hsv=img.astype(int); txt=np.zeros(img.shape[:2],bool)&((hsv.sum(2)/3>170)&(abs(hsv[...,0]-hsv[...,2])<45)&(hsv[...,0]>=hsv[...,2]))
out={}
for k,groups in G.items():
    xs=[g[0][0] for g in groups]+[g[0][2] for g in groups]; ys=[g[0][1] for g in groups]+[g[0][3] for g in groups]
    X0,Y0,X1,Y1=max(0,min(xs)-40),max(0,min(ys)-40),min(W,max(xs)+40),min(H,max(ys)+40)
    p.set_image(img[Y0:Y1,X0:X1])
    full=np.zeros((H,W),bool)
    for box,pos,neg in groups:
        pts=np.array([(x-X0,y-Y0) for x,y in pos+neg],float); lab=np.array([1]*len(pos)+[0]*len(neg))
        b=np.array([box[0]-X0,box[1]-Y0,box[2]-X0,box[3]-Y0],float)
        ms,sc,_=p.predict(point_coords=pts,point_labels=lab,box=b,multimask_output=True)
        # 選包含最多正向點、分數最高的
        best=max(range(3),key=lambda i:(sum(ms[i][int(y-Y0),int(x-X0)] for x,y in pos)>=len(pos)-1,sc[i]))
        full[Y0:Y1,X0:X1]|=ms[best]
    m=(full&~txt).astype(np.uint8)
    n,lbl,st,_=cv2.connectedComponentsWithStats(m,8)
    if n>1:
        big=st[1:,cv2.CC_STAT_AREA].max()
        keep=[i for i in range(1,n) if st[i,cv2.CC_STAT_AREA]>=big*0.03]
        m=np.isin(lbl,keep).astype(np.uint8)
    # 補小洞
    inv=(1-m).astype(np.uint8); n,lbl,st,_=cv2.connectedComponentsWithStats(inv,4)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<2500 and x>0 and y>0 and x+w<W and y+h<H: m[lbl==i]=1
    out[k]=m.astype(bool); print(k,int(m.sum()))
np.savez_compressed('masks.npz',**out)
