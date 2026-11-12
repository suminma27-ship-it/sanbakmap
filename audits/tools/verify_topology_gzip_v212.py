#!/usr/bin/env python3
"""Read-only byte verification of sanbakmap nationwide gzip packs."""
import base64, gzip, hashlib, json, re, sys, zlib
from pathlib import Path
paths={int(m.group(1)):p for p in map(Path,sys.argv[1:]) if (m:=re.search(r'pack-(\d\d)\.js$',p.name))}
assert sorted(paths)==list(range(16)), "Require all 16 uniquely named pack files"
chunks=[]
for i in range(16):
    raw=paths[i].read_bytes()
    found=re.findall(rb"""['"]([A-Za-z0-9+/]{1000,}={0,2})['"]""",raw)
    assert len(found)==1, f"Invalid Base64 literal in {paths[i]}"
    chunks.append(found[0])
compressed=base64.b64decode(b''.join(chunks),validate=True)
assert len(compressed)==1418757
assert hashlib.sha256(compressed).hexdigest()=="6b2bd6d8dcbf47644c641292856ec22d621a96ab744e082b9635bea4b169c936"
plain=gzip.decompress(compressed)
assert len(plain)==6229684
assert f"{zlib.crc32(plain):08x}"=="f0e981ca"
assert hashlib.sha256(plain).hexdigest()=="3633233ade850742d5995558b1fe64a4a880ff2de72fc86359de3c56b4c5a3da"
obj=json.loads(plain)
print(json.dumps({"status":"PASS_BYTE_LEVEL_ONLY","compressed_sha256":hashlib.sha256(compressed).hexdigest(),"json_sha256":hashlib.sha256(plain).hexdigest(),"json_root_type":type(obj).__name__,"json_root_keys":sorted(obj) if isinstance(obj,dict) else None},ensure_ascii=False))
