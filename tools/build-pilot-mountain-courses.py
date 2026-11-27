"""Build reference layers and two explicitly fixed pilot course slices from the existing source archives.
No routing graph, no runtime stitching, no invented height values.
"""
import base64,gzip,json,math,pathlib,re,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
data=root/'data'
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def write(p,obj): p.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
chunks=[]
for i in range(11):
    text=(data/'nationwide-full'/f'part-{i:02}.js').read_text(encoding='utf-8')
    chunks.append(json.loads(re.search(r'\)\[\d+\]=(.*);\s*$',text,re.S).group(1)))
bundled=json.loads(''.join(chunks))
index=read(data/'nationwide'/'index.json')['mountains']
archive=data/'nationwide-elevation-pack'/'nationwide-dem-v109.zip'
def decode_line(s):
    p=0;lon=lat=0;out=[]
    def read_delta():
        nonlocal p
        v=k=0
        while True:
            b=ord(s[p])-63;p+=1;v|=(b&31)<<k;k+=5
            if not b&32:return ~(v>>1) if v&1 else v>>1
    while p<len(s):
        lon+=read_delta();lat+=read_delta();out.append([lon/1e5,lat/1e5])
    return out
def dist(a,b):
    r=math.pi/180
    x=math.sin((b[1]-a[1])*r/2)**2+math.cos(a[1]*r)*math.cos(b[1]*r)*math.sin((b[0]-a[0])*r/2)**2
    return 12742017.6*math.asin(min(1,math.sqrt(x)))
def cum(c):
    out=[0.]
    for a,b in zip(c,c[1:]):out.append(out[-1]+dist(a,b))
    return out
def heights(s):
    raw=base64.urlsafe_b64decode(s+'='*((4-len(s)%4)%4));out=[];v=k=z=0
    for b in raw:
        v+=(b&127)<<k
        if b&128:k+=7;continue
        z+=-(v//2+1) if v%2 else v//2;out.append(z/10);v=k=0
    return out
def points_for(pack,row,coords):
    if not pack:return None
    edges=sorted([(p[4],p[5],p[2],pack['samples'][k]) for k,p in pack['edgeIdentities'].items() if p[3]==row and k in pack['samples']])
    if not edges or edges[0][0]!=0:return None
    out=[];total=0.;end=0
    for a,b,length,s in edges:
        if a!=end:return None
        vals=heights(s)
        if len(vals)!=math.ceil(length/90)+1:return None
        for i,z in enumerate(vals):
            d=total+(length if i==len(vals)-1 else i*90)
            if not out or d>out[-1][0]+.01:out.append([d,z])
        total+=length;end=b
    length=cum(coords)[-1]
    if total<=0 or abs(total-length)>max(80,length*.1):return None
    return [[d*length/total,z] for d,z in out]
def cut_profile(p,lo,hi):
    if p is None:return None
    def at(x):
        for a,b in zip(p,p[1:]):
            if a[0]<=x<=b[0]+1e-5:return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])
        return p[-1][1]
    a,b=sorted([lo,hi])
    out=[[a,at(a)]]+[q for q in p if a<q[0]<b]+[[b,at(b)]]
    return [[x-a,z] for x,z in out] if lo<=hi else [[b-x,z] for x,z in reversed(out)]
def load(code):
    bucket=index[code]['bucket']
    raw=json.loads(gzip.decompress(base64.b64decode(bundled[bucket])))
    rows=raw['mountains'][code]
    pack=None
    if archive.exists():
        with zipfile.ZipFile(archive) as z:
            pack=json.loads(z.read(f'data/nationwide-elevation/bucket-{bucket}.json'))['mountains'].get(code)
    return rows,pack
def public_dem(coords):
    """Sample actual stored route coordinates with Copernicus GLO-90 via Open-Meteo."""
    import urllib.request,urllib.parse,time
    ds=cum(coords);total=ds[-1]
    targets=list(range(0,math.ceil(total),90))+[total]
    positions=[];j=1
    for t in targets:
        while j<len(ds)-1 and ds[j]<t:j+=1
        k=(t-ds[j-1])/(ds[j]-ds[j-1]) if ds[j]>ds[j-1] else 0
        positions.append([round(coords[j-1][i]+k*(coords[j][i]-coords[j-1][i]),7) for i in range(2)])
    vals=[]
    for i in range(0,len(positions),80):
        part=positions[i:i+80]
        query=urllib.parse.urlencode({'latitude':','.join(str(p[1]) for p in part),'longitude':','.join(str(p[0]) for p in part)})
        url='https://api.open-meteo.com/v1/elevation?'+query
        for attempt in range(2):
            try:
                with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'sanbakmap-reference-profile/1.0'}),timeout=30) as response:
                    z=json.load(response)['elevation']
                if len(z)!=len(part) or any(not isinstance(x,(int,float)) or not math.isfinite(x) or not -500<x<9000 for x in z):
                    raise ValueError('invalid public DEM response')
                vals.extend(z);break
            except Exception:
                if attempt:raise
                time.sleep(2)
    return [{'distanceMeters':round(d,2),'elevationMeters':z} for d,z in zip(targets,vals)]

def build(code,slug):
    rows,pack=load(code)
    path=data/f'{slug}-predefined-routes.json';cat=read(path)
    features=[]
    for i,row in enumerate(rows):
        for j,s in enumerate(row[5]):
            coords=decode_line(s)
            if len(coords)>1:features.append({'type':'Feature','properties':{'sourceId':f'forest:{code}:{i}:{j}','name':row[3] or '산림청 원본','facility_type':'탐방로'},'geometry':{'type':'LineString','coordinates':coords}})
    write(data/f'{slug}-source-reference.geojson',{'type':'FeatureCollection','features':features,'metadata':{'source':'산림청 DATA002 2016 자료','currentAccessVerified':False}})
    def line(i):return decode_line(rows[i][5][0])
    # The Jirisan source summit-side corridor is only a reference portion:
    # do not present the forest record as an independently confirmed Kalbawi route.
    if slug=='jiri':
        specs=[(113,None,None,True),(116,None,None,True),(119,None,None,True)]
        r={'id':'jref','name':'중산리 방면 → 천왕봉 (기관 원본 참고 구간)','group':'천왕봉','via':['중산리 방면 원본 지점','천왕봉 부근'],'source':'산림청 DATA002','accessStatus':'unknown','coverage':'partial','notes':'산림청 원본의 중산리 방면~천왕봉 부근 구간. 공단 5.4km 칼바위 전체 코스와 동일하다고 확정하지 않음.'}
        cat['routes']=[x for x in cat['routes'] if x['id']!='jref']+[r]
    else:
        # Only show Seolcheonbong–Hyangjeokbong if both named endpoints are
        # actually near the same existing source line and its slice is plausible.
        c=line(6)
        start=[127.744168808,35.864836674];end=[127.7463213111,35.8603779063]
        a=min(range(len(c)),key=lambda i:dist(start,c[i]));b=min(range(len(c)),key=lambda i:dist(end,c[i]))
        length=abs(cum(c)[a]-cum(c)[b])
        if max(dist(start,c[a]),dist(end,c[b]))>120 or not 350<=length<=1000:
            print('DEOGYU: source row 6 does not cover both official endpoints; catalog only')
            return
        specs=[(6,min(a,b),max(a,b),a>b)]
        r=next(x for x in cat['routes'] if x['id']=='d1')
        r.update(coverage='partial',notes='산림청 원본 선형의 설천봉·향적봉 인근 참고 구간. 공단 안내거리 0.6km와 구분.')
    # Each recipe is a fixed selection of existing source records, not a runtime route finder.
    try:register_route(code,slug,rows,pack,r,specs)
    except Exception as e:print(f'::warning::{slug} {r["id"]}: {e}')
    if slug=='jiri':
        # Baekmudong control office and Jangteomok shelter reference coordinates:
        # https://mapcarta.com/N993598255 and https://mapcarta.com/N1038268378
        baek=[(138,None,None,False),(164,None,None,False),(154,None,None,False)]
        jung=[(113,None,None,True),(116,None,None,True),(119,None,None,True)]
        nogo=[(37,None,None,False),(28,None,None,False),(31,None,None,False)]
        # Fixed recipes from existing forest source records; no route-name
        # matching and no automatic graph or guessed connector.
        def reverse_route(parts):
            return [(i,a,b,not rev) for i,a,b,rev in reversed(parts)]
        # 113 -> 114 -> 158 -> 164 -> 154 -> summit -> reverse jung.
        # The original approach begins above the official visitor center.
        loop=[(113,None,None,True),(114,None,None,True),(158,None,None,True),
              (164,None,None,False),(154,None,None,False)]+reverse_route(jung)
        # Historical east-side corridor, not the complete Yupyeong approach.
        east=[(155,None,None,True)]+reverse_route(jung)
        # Forest record 26 starts near Hwaeomsa and climbs toward Munengi.
        hwaeom=[(26,None,None,True)]
        recipes=[
            ('j7',loop,'중산리 방면 원본 지점','중산리 방면 원본 지점','산림청 원본의 중산리 방면~장터목~천왕봉~중산리 방면 참고 원점회귀. 탐방안내소 접근로 및 모든 경유지의 정확한 위치는 미확인.'),
            ('j6',east,'유평리 방면 원본 지점','중산리 방면 원본 지점','유평리 방면 원본 선형과 천왕봉 부근~중산리 방면 원본을 연결한 참고 구간. 대원사 접근로 및 치밭목 경유 위치는 미확인.'),
            ('j10',hwaeom,'화엄사 부근','무넹기 방면 원본 지점','화엄사 부근에서 무넹기 방면으로 이어지는 산림청 원본 참고 구간. 연기암 경유 및 공식 전체 7km와 일치 여부 미확인.'),
            ('j2',baek,'백무동 부근','천왕봉 부근','백무동 통제소 부근~장터목~천왕봉 방향의 산림청 원본 참고선. 공단 안내 7.5km와 동일한 전체 접근 경로로 단정하지 않음.'),
            ('j4',baek+[(i,a,b,not rev) for i,a,b,rev in reversed(jung)],'백무동 부근','중산리 방면 원본 지점','백무동~장터목~천왕봉~중산리 방향의 기존 원본 참고 구간. 양쪽 실제 탐방지원센터 접근로 포함 여부 미확인.'),
            ('j3',nogo,'성삼재 부근','노고단고개 부근','성삼재에서 노고단고개 방향의 산림청 원본 참고선. 노고단 정상 예약 탐방 구간은 포함하지 않음.')]
        for rid,specs,startLabel,endLabel,note in recipes:
            target=next(x for x in cat['routes'] if x['id']==rid)
            # Keep the guide course name, but clearly label the actual displayed partial geometry.
            target.update(coverage='partial',startLabel=startLabel,endLabel=endLabel,notes=note)
            if target.get('geometryFile') and target.get('profileFile') and (root/target['geometryFile']).is_file() and (root/target['profileFile']).is_file():
                continue
            try:register_route(code,slug,rows,pack,target,specs)
            except Exception as e:print(f'::warning::{slug} {rid}: {e}')
        cat['poiReference']={'schema':'sanbak-route-poi-reference-v1','note':'OSM/공개기관 주요지점 참고 좌표. 코스에 가까운 지점만 표시.','points':[
            {'name':'장터목대피소','label':'장터목대피소','lonlat':[127.71635,35.33254],'source':'https://mapcarta.com/N1038268378'},
            {'name':'노고단대피소','label':'노고단대피소','lonlat':[127.526,35.29585],'source':'https://apihub.kma.go.kr/ 산악예보 지점자료'}]}
    else:
        # The separate Namdeogyusan source code has records omitted by the Hyangjeokbong code.
        # Publish a clearly named original source line, not an invented Yeonggaksa ascent.
        south='457300301'
        south_rows,south_pack=load(south)
        for i,row in enumerate(south_rows):
            for j,encoded in enumerate(row[5]):
                xy=decode_line(encoded)
                if len(xy)>1:features.append({'type':'Feature','properties':{'sourceId':f'forest:{south}:{i}:{j}','name':row[3] or '산림청 원본','facility_type':'탐방로'},'geometry':{'type':'LineString','coordinates':xy}})
        write(data/f'{slug}-source-reference.geojson',{'type':'FeatureCollection','features':features,'metadata':{'source':'산림청 DATA002 2016~2019 자료','currentAccessVerified':False}})
        extra={'id':'dref-south','group':'기타코스','name':'남덕유산 · 양악리구간 (산림청 원본)','via':['양악리 방면 원본 시작점','남덕유산 서쪽 원본 종점'],'source':'산림청 DATA002','accessStatus':'unknown','coverage':'reference','notes':'남덕유산 산코드의 양악리구간 원본. 남덕유산 정상 또는 영각사 코스로 연결한 것이 아님.'}
        cat['routes']=[x for x in cat['routes'] if x['id']!=extra['id']]+[extra]
        try:register_route(south,slug,south_rows,south_pack,extra,[(8,None,None,False)])
        except Exception as e:print(f'::warning::{slug} {extra["id"]}: {e}')
    write(path,cat)

def register_route(code,slug,rows,pack,r,specs):
    def line(i):return decode_line(rows[i][5][0])
    coords=[];pts=[];offset=0.;complete=True;source_ids=[]
    for row,a,b,reverse in specs:
        if len(rows[row][5])!=1:raise ValueError('multipart record is not a fixed course segment')
        if rows[row][7]=='Y' or rows[row][8]=='Y':raise ValueError('historical restricted or closed source record')
        c=line(row);ds=cum(c);a=0 if a is None else a;b=len(c)-1 if b is None else b
        piece=c[a:b+1];p=cut_profile(points_for(pack,row,c),ds[b] if reverse else ds[a],ds[a] if reverse else ds[b])
        if reverse:piece.reverse()
        gap=dist(coords[-1],piece[0]) if coords else 0.
        if gap>15:raise ValueError('fixed source segments do not meet')
        offset+=gap
        if p is None:complete=False
        else:
            for d,z in p:
                d=round(offset+d,2)
                if not pts or d>pts[-1]['distanceMeters']:pts.append({'distanceMeters':d,'elevationMeters':round(z,1)})
        coords+=piece[1:] if coords and gap<.001 else piece
        offset+=cum(piece)[-1]
        source_ids.append(f'forest:{code}:{row}:{a}-{b}:{reverse}')
    sourceId='+'.join(source_ids);rid=r['id']
    geomfile=f'{slug}-{rid}-reference.geojson';demfile=f'{slug}-{rid}-reference-dem.json'
    write(data/geomfile,{'type':'Feature','properties':{'routeId':rid,'sourceId':sourceId,'source':'산림청 DATA002','currentAccessVerified':False,'startLabel':r.get('startLabel',r['via'][0]),'endLabel':r.get('endLabel',r['via'][-1]),**({'officialCourseGuideKm':r['guideKm']} if r.get('guideKm') else {})},'geometry':{'type':'LineString','coordinates':coords}})
    r.update(geometryStatus='reference',geometryFile='./data/'+geomfile,profileStatus='unverified',profileFile=None)
    dem_source='기존 전국 DEM v109 ZIP'
    if not complete or len(pts)<2:
        # Preserve already committed public DEM samples when the same source line is rebuilt.
        try:
            cached=read(data/demfile)
            if cached['sourceId']!=sourceId or abs(cached['totalMeters']-offset)>1 or len(cached['points'])<2:raise ValueError('cached profile mismatch')
            pts=cached['points'];dem_source=cached['sourceFile'];complete=True
        except (OSError,ValueError,KeyError,TypeError):
            try:
                pts=public_dem(coords);dem_source='https://open-meteo.com/en/docs/elevation-api';complete=True
            except Exception as e:
                print(f'::warning::{slug} public DEM unavailable: {e}')
    if complete and len(pts)>=2:
        profile={'schema':'sanbak-predefined-dem-profile-v1','routeId':rid,'sourceId':sourceId,'sourceFile':dem_source,'currentAccessVerified':False,'totalMeters':round(offset,2),'startLabel':r.get('startLabel',r['via'][0]),'endLabel':r.get('endLabel',r['via'][-1]),'points':pts}
        if dem_source.startswith('https://'):
            profile.update(source='Copernicus DEM 2021 GLO-90 via Open-Meteo',sourceDemResolutionMeters=90)
            r['notes']+=' 고도는 Copernicus GLO-90 / Open-Meteo 참고값.'
        write(data/demfile,profile)
        r.update(profileStatus='reference',profileFile='./data/'+demfile)
        print('PILOT_DEM_JSON '+slug+' '+json.dumps(profile,ensure_ascii=False,separators=(',',':')))
    print(f'PILOT {slug}: {rid} {offset:.1f}m, DEM {len(pts) if complete else 0} samples')
for code,slug in [('488605302','jiri'),('457300702','deogyu')]:
    try:build(code,slug)
    except Exception as e:print(f'::warning::{slug} pilot source extraction unavailable: {e}')
