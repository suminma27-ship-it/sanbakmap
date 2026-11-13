#!/usr/bin/env python3
"""Read-only byte verification; explicit checks remain enabled under Python -O."""
import base64, gzip, hashlib, json, re, sys, zlib
from pathlib import Path
def require(ok, message):
    if not ok:
        raise ValueError(message)
paths={}
for p in map(Path,sys.argv[1:]):
    m=re.fullmatch(r'pack-(\d\d)\.js',p.name)
    require(m is not None, f"Unexpected pack filename: {p.name}")
    i=int(m.group(1))
    require(i not in paths, f"Duplicate pack index: {i:02d}")
    paths[i]=p
require(sorted(paths)==list(range(16)), "Require exactly pack-00.js through pack-15.js")
chunks=[]
for i in range(16):
    raw=paths[i].read_bytes()
    found=re.findall(rb"""['"]([A-Za-z0-9+/]{1000,}={0,2})['"]""",raw)
    require(len(found)==1, f"Invalid Base64 literal in {paths[i]}")
    chunks.append(found[0])
compressed=base64.b64decode(b''.join(chunks),validate=True)
require(len(compressed)==1418757, "Byte-level invariant mismatch")
require(hashlib.sha256(compressed).hexdigest()=="6b2bd6d8dcbf47644c641292856ec22d621a96ab744e082b9635bea4b169c936", "Byte-level invariant mismatch")
plain=gzip.decompress(compressed)
require(len(plain)==6229684, "Byte-level invariant mismatch")
require(f"{zlib.crc32(plain):08x}"=="f0e981ca", "Byte-level invariant mismatch")
require(hashlib.sha256(plain).hexdigest()=="3633233ade850742d5995558b1fe64a4a880ff2de72fc86359de3c56b4c5a3da", "Byte-level invariant mismatch")
obj=json.loads(plain)
print(json.dumps({"status":"PASS_BYTE_LEVEL_ONLY","compressed_sha256":hashlib.sha256(compressed).hexdigest(),"json_sha256":hashlib.sha256(plain).hexdigest(),"json_root_type":type(obj).__name__,"json_root_keys":sorted(obj) if isinstance(obj,dict) else None},ensure_ascii=False))
