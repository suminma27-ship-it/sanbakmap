#!/usr/bin/env python3
"""Read-only consistency gate for the original-geometry topology manifest.
Does not validate physical trail access or independently reconstruct original SHP.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

EXPECTED = {
    'schema': 'sanbak-original-geometry-topology-package-v102',
    'source_features': 59397,
    'source_line_parts': 66503,
    'source_original_vertices': 6094963,
    'mountain_codes': 2902,
    'graph_nodes': 59301,
    'graph_edges': 67185,
    'gzip_bytes': 1418757,
    'raw_bytes': 6229684,
    'base64_parts': 16,
    'snapped_gaps': 0,
}
HASHES = {'source_zip_sha256','gzip_sha256','raw_sha256'}

def require(cond, msg):
    if not cond:
        raise ValueError(msg)

def verify(path):
    data = Path(path).read_bytes()
    manifest = json.loads(data)
    require(type(manifest) is dict, 'Manifest must be an object')
    for key, value in EXPECTED.items():
        require(key in manifest, f'Missing {key}')
        require(type(manifest[key]) is type(value) and manifest[key] == value, f'Unexpected {key}')
    for key in HASHES:
        require(type(manifest.get(key)) is str and re.fullmatch('[0-9a-f]{64}',manifest[key]) is not None, f'Invalid {key}')
    require('routing not allowed' in manifest.get('status',''), 'Missing non-routing warning')
    require('no proximity edges' in manifest.get('spatial_rule',''), 'Missing no-proximity restriction')
    require(manifest['source_original_vertices'] >= manifest['source_line_parts'], 'Invalid vertex count')
    return {'status':'PASS_MANIFEST_METADATA_ONLY','manifest_sha256':hashlib.sha256(data).hexdigest(),
            'mountain_codes':manifest['mountain_codes'],'graph_edges':manifest['graph_edges'],
            'source_zip_sha256':manifest['source_zip_sha256'],
            'limitations':'Metadata agreement only; not independent SHP or DEM verification'}

if __name__ == '__main__':
    require(len(sys.argv)==2,'Usage: verify_manifest_v229.py MANIFEST')
    print(json.dumps(verify(sys.argv[1]),sort_keys=True))
