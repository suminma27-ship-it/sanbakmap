"""Publish already collected source geometry for all mountain codes.
No new routing, geometry stitching, or source verification project.
"""
import base64,gzip,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'data'/'nationwide-full'
out=root/'data'/'nationwide'
parts=[]
for i in range(11):
    raw=(source/f'part-{i:02}.js').read_text(encoding='utf-8')
    parts.append(json.loads(re.search(r'\)\[\d+\]=(.*);\s*$',raw,re.S).group(1)))
bundle=json.loads(''.join(parts))
index=json.loads((out/'index.json').read_text(encoding='utf-8'))['mountains']
published=set()
for bucket in sorted(bundle):
    raw=gzip.decompress(base64.b64decode(bundle[bucket]))
    obj=json.loads(raw)
    if obj.get('schema')!='sanbak-national-institutional-lines-v1' or not isinstance(obj.get('mountains'),dict):
        raise ValueError('Unexpected source bucket '+bucket)
    for code,rows in obj['mountains'].items():
        if code not in index or index[code]['bucket']!=bucket or len(rows)!=index[code]['count']:
            raise ValueError('Source index mismatch '+code)
        published.add(code)
    (out/f'bucket-{bucket}.json').write_bytes(raw)
if published!=set(index):
    raise ValueError('Missing mountain source buckets')
print(f'PASS nationwide geometry publish: {len(published)} mountains, {sum(x["count"] for x in index.values())} source records, {len(bundle)} buckets')
