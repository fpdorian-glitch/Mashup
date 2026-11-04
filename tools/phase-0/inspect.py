#!/usr/bin/env python3
"""Offline source inventory. Does not read credentials or contact any service."""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
def inventory():
    paths = sorted([ROOT/'index.html', ROOT/'reset.html', ROOT/'version.json', *ROOT.glob('*.js'), *ROOT.glob('*.css'), *ROOT.glob('backend/*.js'), *ROOT.glob('content/*.json'), *ROOT.glob('art-factory/*'), *ROOT.glob('assets/*'), *ROOT.glob('patrons/*')])
    files = []
    calls = []
    for p in paths:
        if not p.is_file(): continue
        data = p.read_bytes()
        files.append({'path':str(p.relative_to(ROOT)), 'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        if p.suffix not in ('.js','.html'): continue
        for number,line in enumerate(data.decode().splitlines(),1):
            for match in re.finditer(r"\b(api|request)\(\s*(['\"])([^'\"]+)\2",line):
                route = match[3]
                if not (route.startswith('/api/') or p.name=='04-games-ui.js'): continue
                tail=line[match.end():].lstrip()
                dynamic=tail.startswith('+')
                calls.append({'file':str(p.relative_to(ROOT)),'line':number,'call':match[1],'route':route,'dynamic_suffix':dynamic,'method': 'POST' if tail.startswith(',') else 'GET' if tail.startswith(')') else 'REVIEW'})
    return {'scope':'observed source only; lexical extraction, not an OpenAPI schema; historical unreachable calls may be included','files':files,'calls':calls}
if __name__ == '__main__': print(json.dumps(inventory(),ensure_ascii=False,indent=2))
