#!/usr/bin/env python3
"""Read-only strict JS-wrapper and byte-integrity verification for nationwide topology."""
import base64
import gzip
import hashlib
import json
import re
import sys
import zlib
from pathlib import Path

EXPECTED_PACKS = 16
EXPECTED_COMPRESSED_BYTES = 1418757
EXPECTED_COMPRESSED_SHA256 = '6b2bd6d8dcbf47644c641292856ec22d621a96ab744e082b9635bea4b169c936'
EXPECTED_PLAIN_BYTES = 6229684
EXPECTED_PLAIN_CRC32 = 'f0e981ca'
EXPECTED_PLAIN_SHA256 = '3633233ade850742d5995558b1fe64a4a880ff2de72fc86359de3c56b4c5a3da'

def require(condition, message):
    if not condition:
        raise ValueError(message)

def extract_pack(raw, index):
    # Validate the entire file, not merely a Base64 substring: trailing JS is rejected.
    prefix = rb'\(window\.SANBAK_TOPOLOGY_PARTS\|\|\(window\.SANBAK_TOPOLOGY_PARTS=\[\]\)\)\[' + str(index).encode('ascii') + rb'\]="'
    pattern = prefix + rb'([A-Za-z0-9+/]+={0,2})";\s*'
    match = re.fullmatch(pattern, raw)
    require(match is not None, f'Invalid full JS wrapper or index for pack-{index:02d}.js')
    chunk = match.group(1)
    require(len(chunk) == (91676 if index == 15 else 120000), f'Unexpected Base64 length in pack-{index:02d}.js')
    return chunk

def main(paths):
    by_index = {}
    for p in map(Path, paths):
        m = re.fullmatch(r'pack-(\d\d)\.js', p.name)
        require(m is not None, f'Unexpected pack filename: {p.name}')
        i = int(m.group(1))
        require(i not in by_index, f'Duplicate pack index: {i:02d}')
        by_index[i] = p
    require(sorted(by_index) == list(range(EXPECTED_PACKS)), 'Require exactly pack-00.js through pack-15.js')
    chunks = [extract_pack(by_index[i].read_bytes(), i) for i in range(EXPECTED_PACKS)]
    compressed = base64.b64decode(b''.join(chunks), validate=True)
    require(len(compressed) == EXPECTED_COMPRESSED_BYTES, 'Compressed length mismatch')
    compressed_hash = hashlib.sha256(compressed).hexdigest()
    require(compressed_hash == EXPECTED_COMPRESSED_SHA256, 'Compressed SHA-256 mismatch')
    plain = gzip.decompress(compressed)
    require(len(plain) == EXPECTED_PLAIN_BYTES, 'Plaintext length mismatch')
    require(f'{zlib.crc32(plain):08x}' == EXPECTED_PLAIN_CRC32, 'Plaintext CRC32 mismatch')
    plain_hash = hashlib.sha256(plain).hexdigest()
    require(plain_hash == EXPECTED_PLAIN_SHA256, 'Plaintext SHA-256 mismatch')
    obj = json.loads(plain)
    print(json.dumps({'status': 'PASS_BYTE_LEVEL_AND_WRAPPER', 'compressed_sha256': compressed_hash, 'json_sha256': plain_hash, 'json_root_type': type(obj).__name__, 'json_root_keys': sorted(obj) if isinstance(obj, dict) else None}, ensure_ascii=False))

if __name__ == '__main__':
    main(sys.argv[1:])
