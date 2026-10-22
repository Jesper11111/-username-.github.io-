"""Embed lightweight atlases in the existing four-direction preview controls."""
from pathlib import Path
import json
import re
import base64

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[3]
VIS=Path('C:/Users/User/.codex/visualizations/2026/10/20/01a15a1d-c75d-7212-99df-c1590074bc99')
template=(VIS/'moon-ranger-motion.html').read_text(encoding='utf-8')
for ident,name,cw,ch,version in [('sky-valkyrie','蒼穹女武神・艾爾',384,320,1),('hellfire-archer','冥火骷髏神射',320,280,2)]:
    folder=PROJECT/'images/sprites/morph'/(ident+'-v1')
    ext='avif' if ident=='sky-valkyrie' else 'webp'
    sources={a:'data:image/'+ext+';base64,'+base64.b64encode((folder/(('attack-v2' if ident=='hellfire-archer' and a=='attack' else a)+'-preview.'+ext)).read_bytes()).decode() for a in ['walk','attack','cast','hit']}
    html=re.sub(r'  const sources=.*?;\n',lambda _: '  const sources='+json.dumps(sources,separators=(',',':'))+';\n',template)
    html=html.replace('moon-ranger-motion',ident+'-motion').replace('月光精靈巡林者',name)
    html=html.replace('version:2','version:'+str(version))
    lines=[]
    for line in html.splitlines():
        if 'const sources=' not in line:
            line=line.replace('320','__WIDTH__').replace('240',str(ch)).replace('__WIDTH__',str(cw))
            if 'canvas { display:block;' in line:
                line=line.replace('width:100%;','width:100%; max-width:'+str(cw)+'px; margin:auto;')
            line=line.replace('repeat(4,minmax(0,1fr))','repeat(2,minmax(0,1fr))')
            if ident=='sky-valkyrie':
                line=line.replace("walk:{n:4,ms:130,label:'走路'}","walk:{n:8,ms:80,label:'移動'}")
                line=line.replace("attack:{n:4,ms:140,label:'射箭'}","attack:{n:8,ms:70,label:'射箭'}")
                line=line.replace("cast:{n:2,ms:220,label:'施法'}","cast:{n:4,ms:110,label:'施法'}")
                line=line.replace("hit:{n:2,ms:150,label:'受傷'}","hit:{n:4,ms:80,label:'受傷'}")
                line=line.replace('>走路<','>移動<')
                # Show the actual animation grid, not frame blends or cross-fades.
        lines.append(line)
    html='\n'.join(lines)+'\n'
    out=VIS/(ident+'-motion.html');out.write_text(html,encoding='utf-8')
    assert out.stat().st_size<1000000
    assert 'fetch(' not in html and '<html' not in html and '<!doctype' not in html.lower()
    print(out.name,out.stat().st_size)
