from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
source=Image.open(root/'source.png').convert('RGBA')
source=source.crop(source.getbbox())
source.thumbnail((112,112),Image.Resampling.LANCZOS)
out=Image.new('RGBA',(128,128))
out.alpha_composite(source,((128-source.width)//2,(128-source.height)//2))
bb=out.getbbox()
assert bb and min(bb[:2])>=8 and max(bb[2:])<=120
out.save(root.parents[3]/'images/ui/message-bubbles-v1.png',optimize=True)
print('PASS: 128px RGBA message icon with transparent margins')
