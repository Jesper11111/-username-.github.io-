"""Embed native transparent directional atlases for local four-action playback."""
from pathlib import Path
import base64
import json
import re

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[3]
VIS=Path('C:/Users/User/.codex/visualizations/2026/10/20/01a15a1d-c75d-7212-99df-c1590074bc99')
template=(VIS/'dwarf-gunner-motion.html').read_text(encoding='utf-8')
folder=PROJECT/'images/sprites/morph/flame-death-knight-v1'
sources={a:'data:image/avif;base64,'+base64.b64encode((folder/(a+'-preview.avif')).read_bytes()).decode() for a in ['walk','attack','cast','hit']}
html=re.sub(r'  const sources=.*?;\n',lambda _: '  const sources='+json.dumps(sources,separators=(',',':'))+';\n',template)
html=html.replace('dwarf-gunner-motion','flame-death-knight-motion').replace('矮人蒸氣火銃兵','烈焰死亡騎士').replace('開火','火焰斬擊')
out=VIS/'flame-death-knight-motion.html'
out.write_text(html,encoding='utf-8')
assert out.stat().st_size<1000000
assert 'fetch(' not in html and '<html' not in html and '<!doctype' not in html.lower()
print(out.name,out.stat().st_size)
