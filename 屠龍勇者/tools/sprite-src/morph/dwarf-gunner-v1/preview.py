"""Create a self-contained four-direction preview with original-size transparent art."""
from pathlib import Path
import base64
import json
import re

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[3]
VIS=Path('C:/Users/User/.codex/visualizations/2026/10/20/01a15a1d-c75d-7212-99df-c1590074bc99')
template=(VIS/'moon-ranger-motion.html').read_text(encoding='utf-8')
folder=PROJECT/'images/sprites/morph/dwarf-gunner-v1'
sources={a:'data:image/avif;base64,'+base64.b64encode((folder/(a+'-preview.avif')).read_bytes()).decode() for a in ['walk','attack','cast','hit']}
html=re.sub(r'  const sources=.*?;\n',lambda _: '  const sources='+json.dumps(sources,separators=(',',':'))+';\n',template)
html=html.replace('moon-ranger-motion','dwarf-gunner-motion').replace('月光精靈巡林者','矮人蒸氣火銃兵').replace('射箭','開火').replace('version:2','version:1')
lines=[]
for line in html.splitlines():
    if 'const sources=' not in line:
        line=line.replace('320','__WIDTH__').replace('240','320').replace('__WIDTH__','384')
        line=line.replace('repeat(4,minmax(0,1fr))','repeat(2,minmax(0,1fr))')
        if 'canvas { display:block;' in line:line=line.replace('width:100%;','width:100%; max-width:384px; margin:auto;')
    lines.append(line)
out=VIS/'dwarf-gunner-motion.html'
out.write_text('\n'.join(lines)+'\n',encoding='utf-8')
assert out.stat().st_size<1000000
assert 'fetch(' not in html and '<html' not in html and '<!doctype' not in html.lower()
print(out.name,out.stat().st_size)
