"""Builds the single-file demo (everything inlined) from the source folder.
Run from the project root:  python build_demo.py  ->  Irani-Canteen-Demo.html
"""
import base64, os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
html = rd('index.html')
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', lambda m: '<style>\n' + rd(m.group(1)) + '\n</style>', html)
html = re.sub(r'<script src="([^"]+\.js)"></script>', lambda m: '<script>\n' + rd(m.group(1)).replace('</script>', '<\\/script>') + '\n</script>', html)
imgs = {}
for f in sorted(x for x in os.listdir(root) if x.endswith('.jpg')):
    with open(os.path.join(root, f), 'rb') as fh:
        imgs[f] = 'data:image/jpeg;base64,' + base64.b64encode(fh.read()).decode()
import json
loader = '<script>(function(){var M=' + json.dumps(imgs) + ';function fix(r){if(!r||r.nodeType!==1)return;var l=r.tagName==="IMG"?[r]:r.querySelectorAll("img");for(var i=0;i<l.length;i++){var s=l[i].getAttribute("src");if(s&&M[s])l[i].setAttribute("src",M[s]);}}new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(fix);});}).observe(document,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",function(){fix(document.body);});})();</script>'
html = html.replace('<head>', '<head>\n' + loader, 1)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'Irani-Canteen-Demo.html')
open(out, 'w', encoding='utf-8').write(html)
print('written', out, round(os.path.getsize(out) / 1024), 'KB')
