import argparse, collections, hashlib, html, json, math, pathlib, re, urllib.request, urllib.parse, http.cookiejar, zipfile, xml.etree.ElementTree as ET
SOURCE='한국등산·트레킹지원센터 전국 주요 봉우리 코스 2022-11-16'
URL='https://www.data.go.kr/data/15108086/fileData.do'
NS='{http://www.topografix.com/GPX/1/1}'
def dump(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
def acquire(path):
 if path.exists(): return
 opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 opener.addheaders=[('User-Agent','Mozilla/5.0'),('Referer',URL)]
 def get(url):
  with opener.open(url,timeout=60) as r:return r.read()
 page=html.unescape(get(URL).decode('utf8','replace'))
 for m in re.finditer(r"(?:fn_)?fileDataDown\s*\(\s*['\"](\d+)['\"]\s*,\s*['\"](uddi:[^'\"]+)['\"]",page,re.I):
  pk,detail=m.groups()
  try:
   q=urllib.parse.urlencode(dict(publicDataPk=pk,publicDataDetailPk=detail,atchFileId='',fileDetailSn=1,url='/tcs/dss/selectFileDataDownload.do'))
   meta=json.loads(get('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do?'+q))
   q=urllib.parse.urlencode(dict(atchFileId=meta['atchFileId'],fileDetailSn=meta['fileDetailSn'],dataNm=meta['dataSetFileDetailInfo']['dataNm']))
   blob=get('https://www.data.go.kr/cmm/cmm/fileDownload.do?'+q)
   if not blob.startswith(b'PK'):continue
   path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(blob);return
  except Exception as e:print('PEAK download attempt:',type(e).__name__)
 raise RuntimeError('공공데이터포털 ZIP 다운로드 불가')
def dist(a,b):
 p,q=math.radians(a[1]),math.radians(b[1]);dy=q-p;dx=math.radians(b[0]-a[0]);h=math.sin(dy/2)**2+math.cos(p)*math.cos(q)*math.sin(dx/2)**2;return 12742017.6*math.asin(min(1,math.sqrt(h)))
def segment(el):
 pts=[];d=0
 for p in el.findall(NS+'trkpt'):
  try:
   lon,lat=float(p.attrib['lon']),float(p.attrib['lat']);e=p.findtext(NS+'ele');e=float(e) if e is not None else None
   if not 124<=lon<=132 or not 33<=lat<=39:raise ValueError('outside Korea')
   if e is not None and not math.isfinite(e):e=None
   if pts:
    delta=dist(pts[-1],(lon,lat))
    if delta<0.01:continue
    d+=delta
   pts.append((lon,lat,e,d))
  except (ValueError,KeyError):return None
 if len(pts)<2 or d<10:return None
 keep={0,len(pts)-1};last=0
 for i,p in enumerate(pts):
  if p[3]-last>=40:keep.add(i);last=p[3]
 valid=[i for i,p in enumerate(pts) if p[2] is not None]
 if valid:keep.update([min(valid,key=lambda i:pts[i][2]),max(valid,key=lambda i:pts[i][2])])
 selected=[pts[i] for i in sorted(keep)]
 coords=[[round(p[0],6),round(p[1],6)] for p in selected]
 prof=[dict(distanceMeters=round(p[3],3),elevationMeters=round(p[2],1)) for p in selected if p[2] is not None]
 if len(prof)!=len(selected):prof=[]
 return coords,prof,round(d,3)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--zip',type=pathlib.Path,default=pathlib.Path('data/peak-gpx-source.zip'));parser.add_argument('--out',type=pathlib.Path,default=pathlib.Path('data/public-peak-gpx'));args=parser.parse_args();acquire(args.zip)
 groups=collections.defaultdict(list);names={};files=0;skipped=0;profiles=0
 with zipfile.ZipFile(args.zip) as z:
  members=[x for x in z.namelist() if x.lower().endswith('.gpx')]
  if len(members)!=6748:raise ValueError('unexpected GPX archive file count: '+str(len(members)))
  for path in members:
   match=re.fullmatch(r'(\d{10})_([^/]+)/[^/]+\.gpx',path,re.I)
   if not match:skipped+=1;continue
   code,name=match.groups();names[code]=name;files+=1
   try:root=ET.fromstring(z.read(path));segments=root.findall('.//'+NS+'trkseg')
   except ET.ParseError:skipped+=1;continue
   seq=pathlib.PurePosixPath(path).stem.rsplit('_',1)[-1]
   for i,el in enumerate(segments,1):
    data=segment(el)
    if not data:skipped+=1;continue
    coords,points,metres=data;rid='peak-'+seq+'-'+str(i);via=['원본 출발점','원본 도착점'];title=name+' GPX '+str(int(seq) if seq.isdigit() else seq)+'코스'+(' · 구간 '+str(i) if len(segments)>1 else '')
    geom=dict(type='Feature',properties=dict(routeId=rid,source=SOURCE,sourceFile=path,sourceDistanceMeters=metres,startLabel=via[0],endLabel=via[1]),geometry=dict(type='LineString',coordinates=coords))
    profile=dict(routeId=rid,totalMeters=metres,points=points,sourceType='gpx') if points else None
    profiles+=bool(profile)
    groups[code].append(dict(id=rid,name=title,group='공공 GPX 코스',via=via,source=SOURCE,sourceUrl=URL,sourceFile=path,coverage='reference',geometryStatus='reference',geometryData=geom,profileStatus='reference' if profile else 'unverified',profileData=profile,profileSource='gpx',accessStatus='unknown',notes='2022년 GPX 원본 트랙 구간. 현행 통행·정상 도달 여부는 별도 확인. 원본 누적거리와 기록 고도 사용.'))
 index={}
 for code,routes in groups.items():
  xy=routes[0]['geometryData']['geometry']['coordinates'];lon,lat=xy[len(xy)//2];name=names[code];cat=dict(schema='sanbak-predefined-route-catalog-v1',mountainCode=code,name=name,routes=routes)
  dump(args.out/(code+'.json'),cat);index[code]=dict(code=code,name=name,catalogFile='./data/public-peak-gpx/'+code+'.json',center=[lat,lon],zoom=12,sourceLabel=SOURCE,sourceUrl=URL,routeCount=len(routes),profileCount=sum(bool(r['profileData']) for r in routes))
 count=sum(len(r) for r in groups.values());dump(args.out/'index.json',dict(schema='sanbak-public-peak-index-v1',source=SOURCE,sourceUrl=URL,archiveSha256=hashlib.sha256(args.zip.read_bytes()).hexdigest(),sourceFiles=files,sourcePeaks=len(names),publishedPeaks=len(index),routes=count,profiles=profiles,skipped=skipped,mountains=index));print('PUBLIC_PEAK_TOTAL',len(index),'peaks',files,'files',count,'segments',profiles,'profiles',skipped,'skipped')
if __name__=='__main__':main()
