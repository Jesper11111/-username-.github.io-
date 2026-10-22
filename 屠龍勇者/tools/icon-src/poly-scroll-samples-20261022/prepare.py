"""Render generated icon samples at reference and hotbar sizes; never change the live icon."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
NAMES={'a':'古典獸印','b':'紫晶幻化','c':'暗黑骷髏','d':'金翼聖印'}
FONT='C:/Windows/Fonts/msjh.ttc'

def fit(im,size,padding):
    alpha=im.getchannel('A')
    bb=alpha.point(lambda a:255 if a>16 else 0).getbbox()
    assert bb
    art=im.crop(bb);art.thumbnail((size-padding*2,size-padding*2),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(size,size));out.alpha_composite(art,((size-art.width)//2,(size-art.height)//2))
    return out

def main():
    canvas=Image.new('RGB',(880,780),(20,23,26));draw=ImageDraw.Draw(canvas)
    title=ImageFont.truetype(FONT,25);small=ImageFont.truetype(FONT,17)
    audit=[]
    for i,(key,name) in enumerate(NAMES.items()):
        src=Image.open(ROOT/(key+'-generated.png')).convert('RGBA')
        assert src.getchannel('A').getextrema()[0]==0,key
        icon=fit(src,128,9);icon.save(ROOT/(key+'-128.png'),optimize=True)
        x=30+(i%2)*440;y=22+(i//2)*390
        draw.text((x,y),key.upper()+'  '+name,font=title,fill=(240,229,208))
        large=fit(src,240,16);canvas.paste(large,(x+64,y+44),large)
        draw.text((x,y+304),'快捷欄 40 px',font=small,fill=(189,193,199))
        draw.rounded_rectangle((x+180,y+294,x+236,y+350),radius=5,fill=(11,13,15),outline=(115,100,66),width=2)
        tiny=icon.resize((40,40),Image.Resampling.LANCZOS);canvas.paste(tiny,(x+188,y+302),tiny)
        audit.append({'id':key,'name':name,'source':key+'-generated.png','sourceSize':src.size,'icon':key+'-128.png','alpha':icon.getchannel('A').getextrema()})
    canvas.save(ROOT/'comparison.png',optimize=True)
    (ROOT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS: four transparent 128px samples; 40px hotbar comparison; live icon untouched')

if __name__=='__main__':main()
