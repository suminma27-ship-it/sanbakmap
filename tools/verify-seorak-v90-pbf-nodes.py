#!/usr/bin/env python3
"""v90: independently verify exact shared OSM PBF Way.refs for 26 Seoraksan crossings.

Requires only Python stdlib plus the ORIGINAL user-owned Geofabrik OSM PBF.
No official hiking access or public routing is ever approved by this script.
Usage: python tools/verify-seorak-v90-pbf-nodes.py --pbf south-korea-261105.osm.pbf \
       --audit audits/seorak-v90-original-node-review.json
"""
import argparse
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def read_uint(source, pos):
    value = 0
    shift = 0
    while True:
        if pos >= len(source):
            raise ValueError("Truncated protobuf varint")
        byte = source[pos]
        pos += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, pos
        shift += 7
        if shift > 70:
            raise ValueError("Overlong protobuf varint")


def fields(data):
    view = memoryview(data)
    pos = 0
    while pos < len(view):
        tag, pos = read_uint(view, pos)
        number, wire = tag >> 3, tag & 7
        if wire == 2:
            size, pos = read_uint(view, pos)
            end = pos + size
            if end > len(view):
                raise ValueError("Invalid protobuf field size")
            yield number, wire, view[pos:end]
            pos = end
        elif wire == 0:
            value, pos = read_uint(view, pos)
            yield number, wire, value
        elif wire == 1:
            pos += 8
        elif wire == 5:
            pos += 4
        else:
            raise ValueError(f"Unsupported protobuf wire type {wire}")
    if pos != len(view):
        raise ValueError("Malformed protobuf record")


def delta_sint64(packed):
    refs = []
    pos = 0
    previous = 0
    while pos < len(packed):
        value, pos = read_uint(packed, pos)
        previous += (value >> 1) ^ -(value & 1)
        refs.append(previous)
    return refs


def extract_selected_way_refs(pbf_path, target_ids):
    found = {}
    with open(pbf_path, "rb") as stream:
        while True:
            prefix = stream.read(4)
            if not prefix:
                break
            if len(prefix) != 4:
                raise ValueError("Truncated OSM PBF header prefix")
            header_size = struct.unpack(">I", prefix)[0]
            if not 0 < header_size < 65536:
                raise ValueError("Invalid OSM PBF header length")
            header = stream.read(header_size)
            size = next(
                (value for num, wire, value in fields(header) if num == 3),
                None
            )
            if size is None or size < 0 or size > 64 * 1024 * 1024:
                raise ValueError("Invalid compressed OSM block")
            blob = stream.read(size)
            if len(blob) != size:
                raise ValueError("Truncated OSM block")
            raw = None
            zipped = None
            for num, wire, val in fields(blob):
                if num == 1:
                    raw = val
                elif num == 3:
                    zipped = val
            if zipped is not None:
                content = zlib.decompress(zipped)
            elif raw is not None:
                content = raw
            else:
                continue
            for block_num, wire, group in fields(content):
                if block_num != 2:
                    continue
                for group_num, wire, way in fields(group):
                    if group_num != 3:
                        continue
                    way_id = None
                    refs = None
                    for n, wire, value in fields(way):
                        if n == 1:
                            way_id = value
                        elif n == 8:
                            refs = value
                    if way_id in target_ids:
                        if way_id in found:
                            raise ValueError(f"Duplicated PBF way {way_id}")
                        found[way_id] = delta_sint64(refs or b"")
            if len(found) == len(target_ids):
                break
    missing = target_ids.difference(found)
    if missing:
        raise ValueError(f"Missing original PBF way IDs: {sorted(missing)}")
    return found


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--pbf", required=True)
    cli.add_argument("--audit", default="audits/seorak-v90-original-node-review.json")
    cli.add_argument("--skip-sha256", action="store_true",
                     help="Only for diagnostic use. The source is not then authenticated.")
    args = cli.parse_args()
    audit = json.loads(Path(args.audit).read_text(encoding="utf-8"))
    if audit.get("version") != 90 or len(audit.get("cases", [])) != 26:
        raise ValueError("Expected 26 v90 crossing audit cases")
    expected = audit["source_pbf_sha256"]
    if not args.skip_sha256:
        digest = hashlib.sha256()
        with open(args.pbf, "rb") as stream:
            for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest() != expected:
            raise ValueError("PBF SHA-256 differs from the reviewed 2026-11-05 original")
    ids = {int(id_) for case in audit["cases"] for id_ in case["pbf_osm_way_ids"]}
    wayrefs = extract_selected_way_refs(args.pbf, ids)
    matched = 0
    for case in audit["cases"]:
        id_a, id_b = case["pbf_osm_way_ids"]
        node = int(case["pbf_shared_node_id"])
        if id_a == id_b:
            raise ValueError("Identical OSM way IDs cannot prove an intersection")
        if node not in wayrefs[id_a] or node not in wayrefs[id_b]:
            raise ValueError(f"Source PBF shared node mismatch at case {case['number']}")
        if case["allow_auto_link"] or case["allow_routing"]:
            raise ValueError("v90 must not authorize map links or routing")
        matched += 1
    print(json.dumps({
        "pbf_file":Path(args.pbf).name,
        "sha256_checked":not args.skip_sha256,
        "source_way_count":len(ids),
        "verified_exact_node_cases":matched,
        "geometry_added":0,
        "routing_allowed":False,
        "note":"PBF way-node topology only; public passage and original display-to-way mapping remain unverified"
    },ensure_ascii=False))


if __name__ == "__main__":
    main()
