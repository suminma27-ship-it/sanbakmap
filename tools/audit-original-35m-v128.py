#!/usr/bin/env python3
"""Sanbakmap v128: signed original EPSG5179 35m source-contact audit.

NEVER interpret 2D proximity as confirmed hiking passage.
Requires pyshp and shapely>=2.0; reads user-provided original 닭.zip.
"""
import argparse,collections,gzip,hashlib,io,json,math,re,time,zipfile
from pathlib import Path
from shapefile import Reader,POLYLINE
from shapely import STRtree
from shapely.geometry import LineString
from shapely.ops import nearest_points
SHA="7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a"
BANDS=[(0,.15),(.15,.75),(.75,2),(2,5),(5,10),(10,20),(20,35)]

def original(path):
    with path.open("rb") as f:digest=hashlib.file_digest(f,"sha256").hexdigest()
    if digest!=SHA:raise ValueError("Original source ZIP hash mismatch")
    by_code=collections.defaultdict(list)
    feats=parts=0
    with zipfile.ZipFile(path) as outer:
        for filename in outer.namelist():
            if not filename.endswith(".zip"):continue
            with zipfile.ZipFile(io.BytesIO(outer.read(filename))) as inner:
                shp=[p for p in inner.namelist() if p.lower().endswith(".shp")]
                if len(shp)!=1:continue
                stem=shp[0][:-4]
                if any(stem+x not in inner.namelist() for x in [".shx",".dbf"]):continue
                rd=Reader(shp=io.BytesIO(inner.read(stem+".shp")),
                    shx=io.BytesIO(inner.read(stem+".shx")),
                    dbf=io.BytesIO(inner.read(stem+".dbf")),encoding="cp949",encodingErrors="ignore")
                fields=[f[0] for f in rd.fields[1:]]
                if rd.shapeType!=POLYLINE or "PMNTN_SN" not in fields or "MNTN_CODE" not in fields:
                    continue
                codecol=fields.index("MNTN_CODE")
                for row,feature in enumerate(rd.iterShapeRecords()):
                    code=str(feature.record[codecol]).strip()
                    if not re.fullmatch(r"\d{9}",code):continue
                    feats+=1
                    pts=feature.shape.points
                    offsets=list(feature.shape.parts)+[len(pts)]
                    for part in range(len(offsets)-1):
                        coords=pts[offsets[part]:offsets[part+1]]
                        if len(coords)<2:continue
                        line=LineString(coords)
                        if line.length<=1e-8:continue
                        by_code[code].append((filename.split("/")[-1],row,part,line))
                        parts+=1
    if (len(by_code),feats,parts)!=(2902,59397,66503):
        raise ValueError("Original source feature/part count does not match v102 signed manifest")
    return by_code,digest

def tangent(line,at):
    w=min(1.5,max(.1,line.length/4))
    a=line.interpolate(max(0,at-w));b=line.interpolate(min(line.length,at+w))
    dx=b.x-a.x;dy=b.y-a.y
    n=math.hypot(dx,dy)
    return (dx/n,dy/n) if n else (0,0)

def band(d):
    for lo,hi in BANDS:
        if d<=hi:return f"{lo}-{hi}m"
    return ">35m"

def audit(parts,limit=35):
    geoms=[p[3] for p in parts]
    left,right=STRtree(geoms).query(geoms,predicate="dwithin",distance=limit)
    out=[];totals=collections.Counter()
    for i,j in zip(left.tolist(),right.tolist()):
        if i>=j:continue
        a,b=parts[i],parts[j]
        d=a[3].distance(b[3])
        if d>limit+1e-6:continue
        P,Q=nearest_points(a[3],b[3])
        da=a[3].project(P);db=b[3].project(Q)
        u=tangent(a[3],da);v=tangent(b[3],db)
        alignment=abs(u[0]*v[0]+u[1]*v[1])
        if d<.15:
            if a[3].overlaps(b[3]) or a[3].equals(b[3]):kind="overlapping_geometry"
            elif a[3].crosses(b[3]):kind="two_dimensional_crossing"
            else:kind="touch_or_coincident"
        elif alignment>=.92:kind="parallel_nearby"
        else:kind="nearby_transverse"
        totals[band(d)]+=1;totals[kind]+=1
        out.append({"source_a":list(a[:3]),"source_b":list(b[:3]),
          "distance_m":round(d,4),
          "anchor_a_5179":[round(P.x,3),round(P.y,3)],
          "anchor_b_5179":[round(Q.x,3),round(Q.y,3)],
          "along_a_m":round(da,3),"along_b_m":round(db,3),
          "relation_2d":kind,"parallel_alignment":round(alignment,3),
          "physical_connection_confirmed":False,"source":"original_epsg5179_shp"})
    return out,totals

def build(path,outdir,codes=None):
    source,source_hash=original(path);outdir.mkdir(parents=True,exist_ok=True)
    totals=collections.Counter()
    summary={"schema":"sanbak-original-shp-contact-audit-v128",
       "source_sha256":source_hash,"mountains_total":2902,
       "original_features":59397,"original_line_parts":66503,
       "max_gap_m":35,"source":"16 original EPSG:5179 source SHP",
       "physical_connection_confirmed":False,"created_navigation_edges":0,
       "mountains_scanned":0,"mountains_with_candidates":0,"candidates":0}
    selected=sorted(set(source)&set(codes)) if codes else sorted(source)
    for code in selected:
        found,counts=audit(source[code]);totals.update(counts)
        summary["mountains_scanned"]+=1
        summary["mountains_with_candidates"]+=bool(found)
        summary["candidates"]+=len(found)
        if found:
            with gzip.open(outdir/(code+".json.gz"),"wt",encoding="utf-8") as f:
                json.dump({"mountain_code":code,"source_sha256":source_hash,
                  "contacts":found},f,ensure_ascii=False,separators=(",",":"))
    summary["gap_bands"]={f"{a}-{b}m":totals[f"{a}-{b}m"] for a,b in BANDS}
    summary["relation_totals"]={k:v for k,v in totals.items()
        if k not in summary["gap_bands"]}
    (outdir/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")
    return summary

if __name__=="__main__":
    cli=argparse.ArgumentParser()
    cli.add_argument("source_zip",type=Path)
    cli.add_argument("--outdir",type=Path,default=Path("original-contact-v128"))
    cli.add_argument("--codes",nargs="*")
    args=cli.parse_args()
    print("PASS original-precision source audit",json.dumps(
        build(args.source_zip,args.outdir,args.codes),ensure_ascii=False))
