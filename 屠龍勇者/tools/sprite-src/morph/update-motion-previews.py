"""Refresh embedded preview art; preserve the viewer's controls and state handling."""
from pathlib import Path
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[3]
VIS = Path('C:/Users/User/.codex/visualizations/2026/10/20/01a15a1d-c75d-7212-99df-c1590074bc99')
moon = VIS/'moon-ranger-motion.html'
template = moon.read_text(encoding='utf-8')
for ident,name,h in [('moon-ranger','月光精靈巡林者',240),('hellfire-archer','冥火骷髏神射',280)]:
    src = ROOT/'images/sprites/morph'/(ident+'-v1')
    sources = {}
    for action in ['walk','attack','cast','hit']:
        file = 'attack-v2-preview.webp' if ident=='moon-ranger' and action=='attack' else action+'-preview.webp'
        sources[action] = 'data:image/webp;base64,'+base64.b64encode((src/file).read_bytes()).decode()
    html = re.sub(r'  const sources=.*?;\n',lambda _: '  const sources='+json.dumps(sources,separators=(',',':'))+';\n',template)
    html = html.replace('moon-ranger-motion',ident+'-motion').replace('月光精靈巡林者',name)
    html = html.replace("let action='walk'", "let action='attack'")
    html = html.replace('version:1','version:2' if ident=='moon-ranger' else 'version:1')
    if h!=240:
        html = '\n'.join(line if 'const sources=' in line else line.replace('240','280') for line in html.split('\n'))
    out = VIS/(ident+'-motion.html')
    out.write_text(html,encoding='utf-8')
    assert out.stat().st_size<1000000
    assert 'const sources=' in html and 'fetch(' not in html and '<!doctype' not in html.lower()
    print(out.name, out.stat().st_size)
