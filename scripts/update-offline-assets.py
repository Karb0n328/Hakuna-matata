"""Keep local modules, styles and versioned entry points available before going offline."""
from pathlib import Path
import re, json
root=Path(__file__).resolve().parent.parent
p=root/'sw.js';s=p.read_text();a=s.index('const ASSETS=');b=s.index(';',a)
assets=set(json.loads(s[a+len('const ASSETS='):b]))
for f in list(root.glob('*.js'))+list(root.glob('*.css')):
    if f.name!='sw.js':assets.add('./'+f.name)
for f in [root/'index.html',*root.glob('*.js')]:
    for ref in re.findall(r'''["'](\./[^"'\s<>]+\.(?:js|css)(?:\?[^"'\s<>]+)?)["']''',f.read_text()):
        if (root/ref.split('?')[0]).exists() and not ref.startswith('./sw.js'):assets.add(ref)
p.write_text(s[:a]+'const ASSETS='+json.dumps(sorted(assets),ensure_ascii=False)+s[b:])
