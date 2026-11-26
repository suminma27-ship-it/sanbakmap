"""Fetch DEM samples for the already stored KNPS Baekdamsa road. Never invent heights."""
import json, math, pathlib, urllib.parse, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
data=root/"data"
catalog_path=data/"seorak-predefined-routes.json"
catalog=json.loads(catalog_path.read_text(encoding="utf-8"))
route=next(r for r in catalog["routes"] if r["id"]=="a9")
if route.get("profileFile") and (root/route["profileFile"]).exists():
    print("Baekdamsa DEM already stored")
    raise SystemExit(0)
geometry=json.loads((root/route["geometryFile"]).read_text(encoding="utf-8"))
coords=geometry["geometry"]["coordinates"]
def distance(a,b):
    lat1,lat2=math.radians(a[1]),math.radians(b[1])
    x=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 12742017.6*math.asin(min(1,math.sqrt(x)))
ds=[0.0]
for a,b in zip(coords,coords[1:]):
    ds.append(ds[-1]+distance(a,b))
total=ds[-1]
targets=list(range(0,math.ceil(total),90))+[total]
positions=[]
j=1
for t in targets:
    while ds[j]<t and j<len(ds)-1: j+=1
    k=(t-ds[j-1])/(ds[j]-ds[j-1]) if ds[j]>ds[j-1] else 0
    positions.append([round(coords[j-1][i]+k*(coords[j][i]-coords[j-1][i]),7) for i in range(2)])
assert len(positions)<=100 and len(positions)>2
query=urllib.parse.urlencode({"latitude":",".join(str(p[1]) for p in positions),"longitude":",".join(str(p[0]) for p in positions)})
url="https://api.open-meteo.com/v1/elevation?"+query
with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"sanbakmap-reference-profile/1.0"}),timeout=45) as resp:
    heights=json.load(resp)["elevation"]
if len(heights)!=len(targets) or any(not isinstance(h,(int,float)) or not math.isfinite(h) or not -500<h<9000 for h in heights):
    raise ValueError("DEM response contains invalid or missing samples")
profile={"schema":"sanbak-predefined-dem-profile-v1","routeId":"a9","sourceId":geometry["properties"]["sourceId"],"sourceFile":"https://open-meteo.com/en/docs/elevation-api","sourceDemResolutionMeters":90,"source":"Copernicus DEM 2021 GLO-90 via Open-Meteo","currentAccessVerified":False,"totalMeters":round(total,2),"startLabel":geometry["properties"]["startLabel"],"endLabel":geometry["properties"]["endLabel"],"points":[{"distanceMeters":round(d,2),"elevationMeters":h} for d,h in zip(targets,heights)]}
path=data/"seorak-a9-reference-dem.json"
path.write_text(json.dumps(profile,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
route.update(profileStatus="reference",profileFile="./data/"+path.name,source="국립공원공단 2018 진입도로3 + Copernicus DEM GLO-90 / Open-Meteo",notes="백담사 진입도로 원본 좌표의 90m 간격 고도 참고값. Copernicus DEM 2021 GLO-90 / Open-Meteo. 실제 통행 여부와 별개.")
catalog["notes"]="23개 코스 경로와 DEM 참고자료 등록(일부 구간 포함). 현행 통행 여부와 별개."
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("BAEKDAM_DEM_JSON="+json.dumps(profile,ensure_ascii=False,separators=(",",":")))
