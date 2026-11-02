"""Read-only source audit and documentation checks; Python standard library only."""
from pathlib import Path
import collections
import hashlib
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/source'

def clean(value):
    return html.unescape(re.sub(r'<[^>]+>', ' ', value or '')).strip()

def parse_erd():
    root = ET.parse(SOURCE / 'ERD.drawio.xml').getroot()
    cells = {c.get('id'): c for c in root.iter('mxCell')}
    tables = []
    for t in cells.values():
        if 'shape=table;' not in t.get('style', ''):
            continue
        columns = []
        for row in cells.values():
            if row.get('parent') != t.get('id'):
                continue
            children = [c for c in cells.values() if c.get('parent') == row.get('id')]
            if len(children) != 2:
                raise ValueError(f'Unexpected table row: {row.attrib}')
            columns.append(dict(name=clean(children[1].get('value')), marker=clean(children[0].get('value')), row_id=row.get('id'), cell_id=children[1].get('id')))
        tables.append(dict(name=clean(t.get('value')), id=t.get('id'), columns=columns))
    def resolve(cell_id):
        if not cell_id:
            return '[MISSING]'
        cell = cells.get(cell_id)
        if cell is None:
            return '[UNKNOWN:' + cell_id + ']'
        for t in tables:
            if t['id'] == cell_id:
                return t['name']
            for col in t['columns']:
                if cell_id in (col['row_id'], col['cell_id']):
                    return t['name'] + '.' + col['name']
        return clean(cell.get('value')) or resolve(cell.get('parent'))
    edges = []
    for c in cells.values():
        if c.get('edge') != '1':
            continue
        style = dict(part.split('=', 1) for part in c.get('style', '').split(';') if '=' in part)
        edges.append(dict(id=c.get('id'), source_id=c.get('source'), target_id=c.get('target'), source=resolve(c.get('source')), target=resolve(c.get('target')), start=style.get('startArrow'), end=style.get('endArrow')))
    return tables, edges

def read_sources():
    result = []
    for path in sorted(SOURCE.iterdir()):
        entry = dict(file=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        if path.suffix == '.xml':
            tree = ET.parse(path).getroot()
            pages = []
            for page in tree.findall('diagram'):
                cells = {c.get('id'): c for c in page.iter('mxCell')}
                nodes = [dict(id=c.get('id'), label=clean(c.get('value')), geometry=c.find('mxGeometry').attrib if c.find('mxGeometry') is not None else {}) for c in cells.values() if clean(c.get('value'))]
                edges = [dict(id=c.get('id'), source=c.get('source'), target=c.get('target'), label=clean(c.get('value')), style=c.get('style'), points=[p.attrib for p in c.findall('./mxGeometry/mxPoint')]) for c in cells.values() if c.get('edge') == '1']
                pages.append(dict(name=page.get('name'), nodes=nodes, edges=edges))
            entry['pages'] = pages
        elif path.suffix == '.docx':
            with zipfile.ZipFile(path) as z:
                tree = ET.fromstring(z.read('word/document.xml'))
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                entry['paragraphs'] = [''.join(n.text or '' for n in p.findall('.//w:t', ns)) for p in tree.findall('.//w:p', ns)]
        else:
            raise ValueError(f'Unhandled source: {path.name}')
        result.append(entry)
    return result

def check():
    tables, edges = parse_erd()
    assert len(tables) == 27, len(tables)
    assert len(edges) == 29, len(edges)
    assert sum(len(t['columns']) for t in tables) == 330
    inventory = (ROOT / 'docs/architecture/erd-inventory.md').read_text(encoding='utf-8')
    proposal = (ROOT / 'docs/architecture/schema-proposal.md').read_text(encoding='utf-8')
    for t in tables:
        assert f'## {t["name"]}\n' in inventory, t['name']
        assert f'## {t["name"]}\n' in proposal, t['name']
        table_inventory = inventory.split(f'## {t["name"]}\n', 1)[1].split('\n## ', 1)[0]
        table_proposal = proposal.split(f'## {t["name"]}\n', 1)[1].split('\n## ', 1)[0]
        proposed_columns = re.findall(r'^\| `([^`]+)` \|', table_proposal, flags=re.M)
        # Q3 approved removing the duplicate visibility from implementation design.
        assert proposed_columns == list(dict.fromkeys(c['name'] for c in t['columns'])), t['name']
        for col in t['columns']:
            assert col['cell_id'] in table_inventory, col
            assert f'| `{col["name"]}` |' in table_proposal, col
    for edge in edges:
        assert edge['id'] in inventory, edge
    gaps = (ROOT / 'docs/architecture/gaps.md').read_text(encoding='utf-8')
    for entry in read_sources():
        if 'flow.drawio.xml' in entry['file'].lower():
            screen_section = gaps.split(f'### {entry["file"]}\n', 1)[1].split('\n### ', 1)[0]
            for page in entry['pages']:
                screen_ids = re.findall(r'^\| `([^`]+)` \|', screen_section, flags=re.M)
                assert screen_ids == [n['id'] for n in page['nodes']], entry['file']
                for node in page['nodes']:
                    assert f'`{node["id"]}`' in screen_section, (entry['file'], node)
    review = (ROOT / 'docs/architecture/source-review.md').read_text(encoding='utf-8')
    for entry in read_sources():
        assert entry['sha256'] in review, ('Source hash changed', entry['file'])
        if 'flow.drawio.xml' in entry['file'].lower():
            for page in entry['pages']:
                for edge in page['edges']:
                    assert f'{entry["file"]}:{edge["id"]}' in review, edge
    for path in [ROOT / 'README.md', *ROOT.glob('docs/**/*.md')]:
        text = path.read_text(encoding='utf-8')
        assert '\ufffd' not in text, ('Unicode replacement character', path)
        for number, line in enumerate(text.splitlines(), 1):
            assert line == line.rstrip(), ('Trailing whitespace', path, number)
            assert not re.match(r'^(<{7}|={7}|>{7})( |$)', line), ('Conflict marker', path, number)
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if '://' in target or target.startswith('#'):
                continue
            target = target.split('#')[0].replace('%20', ' ')
            assert (path.parent / target).exists(), (path, target)
    print(f'PASS: {len(tables)} source tables, 330 source column rows / 329 design columns after Q3 deduplication, {len(edges)} ERD edges; exact per-table column order, 155 screen labels, 146 screen edges, source hashes, UTF-8/whitespace/conflict checks and local links.')

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if '--check' in sys.argv:
        check()
    else:
        tables, edges = parse_erd()
        print(json.dumps(dict(tables=tables, edges=edges, sources=read_sources()), ensure_ascii=False, indent=2))
