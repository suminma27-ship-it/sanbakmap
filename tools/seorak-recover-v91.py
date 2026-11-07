#!/usr/bin/env python3
"""v91: recover original OSM way/node provenance for the 499 inside-Seoraksan v73 lines.

Inputs must be the SAME DATE as the displayed v73 source:
  * original south-korea-261105.osm.pbf
  * original bbox way LineString GeoJSON extracted from that PBF
  * national-parks-trails.html as deployed, including v73 base64 payload

pip install shapely pyproj
python tools/seorak-recover-v91.py --html national-parks-trails.html \
  --osm-lines seorak-bbox-20261105-osm-lines.geojson \
  --pbf south-korea-261105.osm.pbf --output seorak-v91-original-node-map.json

Does not create, approve, or display routing connections.
"""
import argparse
import base64
import collections
import gzip
import hashlib
import importlib.util
import json
import re
from pathlib import Path
from shapely.geometry import LineString
from shapely.ops import substring, transform
from shapely.strtree import STRtree
from pyproj import Transformer

PBF_SHA="9debe407f31db923be2cb481d41c2e0100ed831555da011853eecacd44193ca8"
V73_SHA="18f7e230d9dbdec2a84b9dba701883b01555eca8c2c943bc2830c9de9573e037"

def check(ok,message):
    if not ok:
        raise ValueError(message)

def ordered_subsequence(src,visible):
    i=0
    for coord in visible:
        while i<len(src) and src[i]!=coord:
            i+=1
        if i==len(src):
            return False
        i+=1
    return True

def load_display(html):
    document=Path(html).read_text(encoding="utf-8")
    found=re.search(r'window\.SANBAK_NP_OSM_B64="([^"]+)"',document)
    check(found,"Missing national-parks v73 source data")
    check(hashlib.sha256(found[1].encode()).hexdigest()==V73_SHA,
          "The embedded v73 source has changed; mapping cannot be reused")
    records=json.loads(gzip.decompress(base64.b64decode(found[1])))
    check(records["data_version"]==73,"Unexpected compressed source version")
    park=records["parks"]["seorak"]
    check(park["line_count"]==499,"Expected 499 source display lines")
    return park

def load_way_sources(geojson):
    obj=json.loads(Path(geojson).read_text(encoding="utf-8"))
    check(obj.get("type")=="FeatureCollection","Raw OSM sources require a FeatureCollection")
    check(len(obj.get("features",[]))>=499,"Raw OSM sources appear incomplete")
    transform_to_m=Transformer.from_crs("EPSG:4326","EPSG:32652",always_xy=True).transform
    rows=[]
    for feature in obj["features"]:
        coords=feature["geometry"]["coordinates"]
        check(feature["geometry"]["type"]=="LineString" and len(coords)>=2,
              "Raw OSM sources must be original LineString ways")
        info=feature["properties"]
        rows.append({"id":int(info["osm_id"]),"tag":info["highway"],
                     "coords":coords,"line":transform(transform_to_m,LineString(coords))})
    return rows,transform_to_m

def candidates(visible,tag,original,tree,to_m):
    display=transform(to_m,LineString(visible))
    found=[]
    for index in tree.query(display.buffer(3)):
        raw=original[int(index)]
        if tag=="track" and raw["tag"]!="track":
            continue
        if tag=="trail" and raw["tag"] not in ("path","footway","pedestrian","steps"):
            continue
        line=raw["line"]
        endpoint=max(line.distance(display.interpolate(0)),
                     line.distance(display.interpolate(display.length)))
        if endpoint>3:
            continue
        coords=raw["coords"]
        is_exact=(ordered_subsequence(coords,visible) or
                  ordered_subsequence(coords,visible[::-1]))
        if is_exact:
            score=(0,0,round(endpoint,6))
            hausdorff=0.0
        else:
            start=line.project(display.interpolate(0))
            end=line.project(display.interpolate(display.length))
            clipped=substring(line,min(start,end),max(start,end))
            if not isinstance(clipped,LineString):
                continue
            hausdorff=display.hausdorff_distance(clipped)
            if hausdorff>3:
                continue
            score=(1,round(hausdorff+endpoint,6),0)
        found.append((score,raw,is_exact,round(hausdorff,3),round(endpoint,3)))
    found.sort(key=lambda item:item[0])
    return found

def extract_refs_from_original_pbf(pbf,wanted):
    # Reuse the tested v90 pure-stdlib OSM PBF parser; never infer node IDs from XY.
    module_path=Path(__file__).with_name("verify-seorak-v90-pbf-nodes.py")
    spec=importlib.util.spec_from_file_location("sanbak_v90_pbf_parser",module_path)
    parser=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    return parser.extract_selected_way_refs(str(pbf),wanted)

def run(html,osm_lines,pbf):
    digest=hashlib.sha256()
    with Path(pbf).open("rb") as stream:
        for chunk in iter(lambda:stream.read(8*1024*1024),b""):
            digest.update(chunk)
    check(digest.hexdigest()==PBF_SHA,"Original PBF SHA-256 differs; stop")
    park=load_display(html)
    original,to_m=load_way_sources(osm_lines)
    tree=STRtree([r["line"] for r in original])
    rows=[]
    for kind in ("trail","track"):
        for index,pts in enumerate(park["segments"][kind]):
            options=candidates(pts,kind,original,tree,to_m)
            check(len(options)>=1,f"No OSM source way found for {kind}:{index}")
            check(len(options)==1,f"Ambiguous OSM source ways for {kind}:{index}")
            _,way,is_exact,haus,endpoint=options[0]
            rows.append({"display_line_id":f"v73:{kind}:{index}",
                         "osm_way_id":way["id"],"osm_highway":way["tag"],
                         "match_status":"source_way_confirmed" if is_exact else "geometry_candidate_only",
                         "matching_hausdorff_m":haus,"max_endpoint_offset_m":endpoint,
                         "display_vertex_count":len(pts),
                         "_source":way["coords"],"_display":pts})
    check(len(rows)==499,"Inside-park sources changed")
    wanted={x["osm_way_id"] for x in rows}
    pbf_refs=extract_refs_from_original_pbf(pbf,wanted)
    for row in rows:
        source=row.pop("_source")
        points=row.pop("_display")
        refs=pbf_refs[row["osm_way_id"]]
        check(len(source)==len(refs),
              f"Raw OSM source vertices differ from original PBF way refs: {row['osm_way_id']}")
        positions=collections.defaultdict(list)
        for i,p in enumerate(source):
            positions[tuple(p)].append(i)
        # Repeated source coordinates are ambiguous; do not assign a fabricated ID.
        identified=[refs[positions[tuple(p)][0]]
                    if len(positions[tuple(p)])==1 else None for p in points]
        row["display_node_ids"]=identified
        row["matched_original_vertex_count"]=sum(n is not None for n in identified)
        row["source_way_node_ids"]=refs
    statuses=collections.Counter(row["match_status"] for row in rows)
    tags=collections.Counter(row["osm_highway"] for row in rows)
    return {
        "version":91,"source_pbf_sha256":PBF_SHA,"v73_compressed_source_sha256":V73_SHA,
        "source_raw_way_count":len(original),"display_lines":499,
        "distinct_source_way_ids":len(wanted),
        "ordered_original_node_subsequence_lines":statuses["source_way_confirmed"],
        "unique_geometry_only_candidate_lines":statuses["geometry_candidate_only"],
        "source_highway_tag_counts":dict(tags),
        "display_vertices_total":sum(row["display_vertex_count"] for row in rows),
        "display_vertices_mapped_to_unambiguous_original_node_ids":
            sum(row["matched_original_vertex_count"] for row in rows),
        "routing_allowed":False,"not_for_navigation":True,"added_display_lines":0,
        "warning":"Original OSM identity does not prove current public access or physical passability. Proximity-only matches remain candidates.",
        "rows":rows
    }

def main():
    args=argparse.ArgumentParser(description=__doc__)
    for name in ("html","osm-lines","pbf","output"):
        args.add_argument("--"+name,required=True)
    options=vars(args.parse_args())
    result=run(options["html"],options["osm_lines"],options["pbf"])
    Path(options["output"]).write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False))

if __name__=="__main__":
    main()
