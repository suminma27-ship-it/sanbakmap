#!/usr/bin/env python3
"""Optional GitHub Pages publishing path for the exact audited national DEM ZIP.

When the binary archive is committed at data/nationwide-elevation-pack/nationwide-dem-v109.zip,
publish all 32 national elevation buckets into the site. Without it, do not
claim that any of the offline audit's 2,723 mountain datasets are hosted.

The archive bytes must match the previously audited SHA-256 exactly.
"""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

AUDIT_SHA="045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e"
GEOJSON_SHA="6e9e51a467d6be4ba35bec5127bbb4b896e36e1dbf884535d1aecaa8605224d2"
GRAPH_SHA="7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a"
PREFIX="data/nationwide-elevation/"
ZIP_NAME="data/nationwide-elevation-pack/nationwide-dem-v109.zip"

def demand(condition, message):
    if not condition:
        raise ValueError(message)

def metadata():
    return {
        "schema":"sanbak-national-dem-online-v110",
        "archiveSHA256":AUDIT_SHA,
        "sourceGeoJSONArchiveSHA256":GEOJSON_SHA,
        "rasterResolutionVerified":False,
        "verticalDatumVerified":False,
        "accessVerified":False,
        "mountedMountains":0,
        "matchedEdges":0,
        "mountains":{},
        "note":"Only actually published source-matched DEM buckets are listed; local ZIP mount is a separate optional source."
    }

def publish(archive, out):
    out=Path(out)
    out.mkdir(parents=True, exist_ok=True)
    result=metadata()
    if not archive or not Path(archive).is_file():
        (out/"online-v110.json").write_text(json.dumps(result,ensure_ascii=False)+"\n")
        return result
    data=Path(archive).read_bytes()
    demand(len(data)<=4*1024*1024,"National elevation ZIP exceeds audited size")
    demand(hashlib.sha256(data).hexdigest()==AUDIT_SHA,"National elevation ZIP SHA256 mismatch")
    expected={PREFIX+"coverage-v109.json","README_ko.txt","tools/build_v109.py"}
    expected.update(PREFIX+f"bucket-{i:02}.json" for i in range(32))
    with zipfile.ZipFile(archive) as zip_file:
        names=zip_file.namelist()
        demand(len(names)==len(expected) and set(names)==expected,"Unexpected ZIP files")
        coverage=json.loads(zip_file.read(PREFIX+"coverage-v109.json"))
        demand(coverage.get("schema")=="sanbak-dem-coverage-v109" and
            coverage.get("checked")==2902 and
            coverage.get("fullSourceRasterVerified") is False and
            coverage.get("summary",{}).get("matchedEdges")==53034 and
            coverage.get("summary",{}).get("matchedMountains")==2723,
            "Audit report is not the approved national dataset")
        records=coverage.get("records",[])
        demand(len(records)==2902,"Audit mountain records missing")
        audit={}
        for record in records:
            code=record.get("code")
            demand(isinstance(code,str) and re.fullmatch(r"\d{9}",code) and code not in audit,
                "Duplicate or invalid audit mountain code")
            audit[code]=record
        published={}
        edge_total=0
        outputs={}
        for i in range(32):
            bucket=f"{i:02}"
            name=f"bucket-{bucket}.json"
            payload=zip_file.read(PREFIX+name)
            demand(len(payload)<3*1024*1024,"Elevation bucket too large")
            batch=json.loads(payload)
            demand(batch.get("schema")=="sanbak-dem-bucket-v109" and
                batch.get("bucket")==bucket and isinstance(batch.get("mountains"),dict),
                "Invalid bucket provenance")
            demand(len(batch["mountains"])==coverage.get("buckets",{}).get(bucket,{}).get("mountains"),
                "Bucket coverage count mismatch")
            for code,pack in batch["mountains"].items():
                evidence=audit.get(code)
                demand(evidence is not None and evidence.get("matchedEdges",0)>0 and code not in published,
                    "Elevation mountain is absent from audit")
                dem=pack.get("dem",{})
                demand(pack.get("schema")=="sanbak-original-edge-dem-packed-v108" and
                    pack.get("mountainCode")==code and pack.get("sourceKind")=="forest" and
                    pack.get("graphArchiveSHA256")==GRAPH_SHA and
                    pack.get("accessVerified") is False and pack.get("spacingMeters")==90 and
                    dem.get("sha256")==GEOJSON_SHA and
                    dem.get("hashKind")=="annotated-geojson-archive" and
                    dem.get("resolutionMeters") is None and
                    dem.get("sourceRasterResolutionVerified") is False and
                    dem.get("verticalDatum")=="원본 DEM 수직기준 미기재" and
                    isinstance(pack.get("samples"),dict) and
                    isinstance(pack.get("edgeIdentities"),dict) and
                    set(pack["samples"])==set(pack["edgeIdentities"]) and
                    len(pack["samples"])==evidence["matchedEdges"] and
                    pack["edgeCount"]==evidence["graphEdges"],
                    "Original-edge profile provenance mismatch "+code)
                published[code]={"bucket":bucket,"matchedEdges":evidence["matchedEdges"],
                    "totalEdges":evidence["graphEdges"]}
                edge_total+=evidence["matchedEdges"]
            outputs[name]=payload
        demand(len(published)==2723 and edge_total==53034,
            "Nationwide source-edge DEM totals do not match audit")
        for name,payload in outputs.items():
            (out/name).write_bytes(payload)
        (out/"coverage-v109.json").write_bytes(zip_file.read(PREFIX+"coverage-v109.json"))
    result["mountedMountains"]=len(published)
    result["matchedEdges"]=edge_total
    result["mountains"]=published
    (out/"online-v110.json").write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n")
    return result

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--archive",default=ZIP_NAME)
    parser.add_argument("--output-dir",required=True)
    args=parser.parse_args()
    m=publish(args.archive,args.output_dir)
    print(f"PASS nationwide DEM publish: {m['mountedMountains']} mountain codes, {m['matchedEdges']} edge samples, original raster metadata unverified")
