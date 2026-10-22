"""Embed versioned motion atlases in the existing directional preview."""
from pathlib import Path
import re,json,base64
ROOT=Path(__file__).resolve().parent
VIS=Path('C:/Users/User/.codex/visualizations/2026/10/20/01a15a1d-c75d-7212-99df-c1590074bc99')
folder=ROOT.parents[3]/'images/sprites/morph/flame-death-knight-v1'
html=(VIS/'flame-death-knight-motion.html').read_text(encoding='utf-8')
sources={a:'data:image/avif;base64,'+base64.b64encode((folder/(a+('-v2' if a in ['walk','attack'] else '')+'-preview.avif')).read_bytes()).decode() for a in ['walk','attack','cast','hit']}
html=re.sub(r'  const sources=.*?;\n',lambda _:'  const sources='+json.dumps(sources,separators=(',',':'))+';\n',html)
html=html.replace('flame-death-knight-motion','flame-death-knight-v2-motion').replace("walk:{n:4,ms:130","walk:{n:8,ms:65").replace("attack:{n:4,ms:140","attack:{n:6,ms:80").replace('火焰斬擊','單手斬擊').replace('version:1','version:2')
out=VIS/'flame-death-knight-v2-motion.html';out.write_text(html,encoding='utf-8')
assert out.stat().st_size<1000000 and 'fetch(' not in html and '<html' not in html
assert 'n:8,ms:65' in html and 'n:6,ms:80' in html
print(out.name,out.stat().st_size)
