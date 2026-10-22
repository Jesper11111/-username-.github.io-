"""Measured anatomical feet and skull-to-sole heights, not effect bounds."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parent
specs={}
data={
 'down':{'cols':[(0,400),(400,755),(765,1115),(1115,1448)],'ys':[0,365,720,1086],'body':200,
  'feet':[(201,337),(581,337),(944,337),(1306,337),(207,677),(555,676),(927,677),(1297,677),(199,995),(565,995),(935,1005),(1308,1004)]},
 'right':{'cols':[(0,425),(345,780),(730,1165),(1120,1448)],'ys':[0,390,750,1086],'body':270,
  'feet':[(205,377),(570,377),(915,377),(1290,377),(207,735),(548,735),(920,737),(1295,735),(196,1070),(558,1070),(937,1070),(1297,1070)]},
 'up':{'cols':[(0,410),(355,790),(735,1135),(1110,1448)],'ys':[0,375,730,1086],'body':240,
  'feet':[(220,360),(566,360),(934,360),(1290,360),(213,706),(540,706),(917,706),(1290,706),(207,1040),(560,1040),(938,1040),(1290,1040)]}
}
for d,v in data.items():
 specs[d]=[]
 for i,foot in enumerate(v['feet']):
  r,c=divmod(i,4);x0,x1=v['cols'][c]
  specs[d].append({'rect':[x0,v['ys'][r],x1,v['ys'][r+1]],'foot':list(foot),'body':v['body']})
specs['right'][3]={'source':'walk-right-04-repair.png','rect':[0,0,1448,1086],'foot':[750,1015],'body':760}
specs['right'][7]={'source':'attack-right-04-repair.png','rect':[0,0,1448,1086],'foot':[785,1015],'body':760}
# Three back-view right-column repairs are measured after their independent strip is generated.
if (ROOT/'up-column-repair.png').exists():
 strip=Image.open(ROOT/'up-column-repair.png')
 for frame,rect,foot,body in [(3,[0,0,730,724],[390,640],430),(7,[730,0,1435,724],[1080,640],430),(11,[1435,0,2172,724],[1800,631],420)]:
  specs['up'][frame]={'source':'up-column-repair.png','rect':rect,'foot':foot,'body':body}
(ROOT/'registration.json').write_text(json.dumps(specs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered 36 anatomical anchors')
