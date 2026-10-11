# 屠龍勇者：創角舞台去背（ARCHITECTURE.md 第 18 節）。在工作資料夾執行，順序 clean.py → seg.py → post.py；需要 src.jpg（＝tools/sprite-src/all-classes.jpg）、sam_b.pth（SAM vit_b 權重）、NotoSansTC.otf
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
im=cv2.imread('src.jpg')
mask=np.zeros(im.shape[:2],np.uint8)
for (x0,y0,x1,y1,box) in [(170,470,300,535,1),(40,800,160,865,0),(1700,535,1900,600,1),(1590,605,1720,670,0)]:
    roi=im[y0:y1,x0:x1].astype(int)
    t=((roi.sum(2)/3>110)&(roi[...,2]>=roi[...,0])).astype(np.uint8)*255
    ys,xs=np.where(t>0)
    # 文字外圍有暗色描邊：整個文字框（加 6px）都重畫
    m=cv2.dilate(t,np.ones((3,3),np.uint8),iterations=3)
    if box: m=np.zeros_like(t); m[max(0,ys.min()-6):ys.max()+7, max(0,xs.min()-6):xs.max()+7]=255
    mask[y0:y1,x0:x1]=np.maximum(mask[y0:y1,x0:x1],m)
out=cv2.inpaint(im,mask,9,cv2.INPAINT_TELEA)
# 小量模糊讓補的區塊和周圍質感一致
cv2.imwrite('clean.png',out)
img=Image.open('clean.png').convert('RGB')
f=ImageFont.truetype('NotoSansTC.otf',34)
txt='魔鬥士'; x,y=1268,742
sh=Image.new('L',img.size,0); ImageDraw.Draw(sh).text((x,y),txt,font=f,fill=230); sh=sh.filter(ImageFilter.GaussianBlur(3))
img.paste((0,0,0),(0,0),sh)
ImageDraw.Draw(img).text((x,y),txt,font=f,fill=(226,218,204))
img.save('labeled.png')
ims=[]
for b in [(150,450,320,560),(20,780,180,880),(1680,520,1920,620),(1570,590,1740,690),(1150,680,1420,820),(150,1130,320,1230)]:
    c=img.crop(b); ims.append(c.resize((c.width*2,c.height*2)))
W=max(i.width for i in ims);H=sum(i.height+6 for i in ims);o=Image.new('RGB',(W,H),(255,0,255));yy=0
for i in ims:o.paste(i,(0,yy));yy+=i.height+6
o.save('chk.png')
