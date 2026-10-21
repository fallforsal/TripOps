"""Structural checks only, not a substitute for dotnet/npm/flutter builds."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
for name in ('Api','Service','Data'):
    project=root/f'backend/src/TripOps.{name}/TripOps.{name}.csproj'
    tree=ET.parse(project)
    assert tree.findtext('.//TargetFramework')=='net10.0', name
    assert (project.parent/'packages.lock.json').is_file(), name
    refs=[p.get('Include').replace('\\','/') for p in tree.findall('.//ProjectReference')]
    expected={'Api':['../TripOps.Service/TripOps.Service.csproj'], 'Service':['../TripOps.Data/TripOps.Data.csproj'], 'Data':[]}[name]
    assert refs==expected, (name,refs)
assert (root/'backend/TripOps.sln').is_file()
assert (root/'backend/tests/TripOps.Tests/packages.lock.json').is_file()
assert not list((root/'backend').rglob('*Migration*.cs'))
assert not any('DbSet<' in p.read_text(encoding='utf-8-sig') for p in (root/'backend/src').rglob('*.cs') if 'obj' not in p.parts)
for path in ('frontend/package-lock.json','frontend/components.json','global.json','mobile/.fvmrc'):
    json.loads((root/path).read_text(encoding='utf-8-sig'))
assert (root/'mobile/pubspec.lock').is_file()
decisions=(root/'docs/architecture/decisions.md').read_text(encoding='utf-8')
for number in range(1,12): assert f'## Q{number} ' in decisions
assert decisions.count('**ĐÃ CHỐT theo xác nhận người dùng')==11
compose=(root/'infra/compose.yaml').read_text(encoding='utf-8')
assert 'sqlserver-data:/var/opt/mssql' in compose
assert '${MSSQL_SA_PASSWORD:?' in compose
for folder in ('frontend/src','mobile/lib','mobile/test'):
    for p in (root/folder).rglob('*'):
        if p.is_file() and p.suffix in ('.tsx','.ts','.dart'):
            text=p.read_text(encoding='utf-8')
            assert '\ufffd' not in text, p
            assert not any(word in text for word in ('ki?m','k?t n?i','Ch?a','nghi?p','ph?n h?i')), p
print('PASS: .NET10 solution/reference direction, lockfiles, no business DbSet/migration, Q1-Q11 resolved, Compose volume/env guard, source encoding.')
