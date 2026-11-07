/* Nationwide common map, v99. No artificial routes or current-open assertions. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const core=window.SanbakNationwideAgency;
const W=1000,H=710;
const DOM_NS='http://www.w3.org/2000/svg';
const e=(kind,attrs={},parent)=>{const el=document.createElementNS(DOM_NS,kind);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(parent)parent.append(el);return el};
const regional={'11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종','41':'경기','42':'강원','43':'충북','44':'충남','45':'전북','46':'전남','47':'경북','48':'경남','49':'제주','51':'강원','52':'전북'};
const state={catalog:[],sourceIndex:null,bucketCache:new Map(),indexPromise:null,source:null,code:'',previewPaths:null,generation:0,cam:{z:1,x:0,y:0},pointer:null};
function message(t){$('status').textContent=t}
function viewMountains(){
 const q=$('search').value.trim().toLowerCase(),region=$('region').value;
 const found=state.catalog.filter(x=>(!region||x.code.slice(0,2)===region)&&(!q||(x.name+' '+x.code).toLowerCase().includes(q)));
 $('resultsCount').textContent=found.length.toLocaleString('ko-KR')+'개 산';
 const pane=$('results');pane.replaceChildren();
 for(const m of found.slice(0,90)){
  const btn=document.createElement('button');btn.type='button';btn.className='mountain'+(state.code===m.code?' active':'');
  const b=document.createElement('strong');b.textContent=m.name;const note=document.createElement('small');
  note.textContent=(regional[m.code.slice(0,2)]||'지역 미확인')+' · '+m.code;
  btn.append(b,note);btn.onclick=()=>select(m.code);pane.append(btn);
 }
 if(found.length>90){const msg=document.createElement('p');msg.textContent='90개만 표시 중 · 산 이름을 검색해 줘';msg.className='muted';pane.append(msg)}
}
function resetCamera(){state.cam={z:1,x:0,y:0}}
function project(lines){
 const bbox=[Infinity,Infinity,-Infinity,-Infinity];
 for(const line of lines)for(const p of line.coords){
  bbox[0]=Math.min(bbox[0],p[0]);bbox[1]=Math.min(bbox[1],p[1]);bbox[2]=Math.max(bbox[2],p[0]);bbox[3]=Math.max(bbox[3],p[1]);
 }
 if(!Number.isFinite(bbox[0]))return null;
 const cx=(bbox[0]+bbox[2])/2,cy=(bbox[1]+bbox[3])/2,cos=Math.cos(cy*Math.PI/180);
 const dx=Math.max(.00015,(bbox[2]-bbox[0])*cos),dy=Math.max(.00015,bbox[3]-bbox[1]);
 const scale=Math.min(900/dx,610/dy);
 return p=>[W/2+(p[0]-cx)*cos*scale,H/2-(p[1]-cy)*scale];
}
function lineD(line,p){
 let out='';
 for(let i=0;i<line.length;i++){const a=p(line[i]);out+=(i?'L':'M')+a[0].toFixed(2)+' '+a[1].toFixed(2)}
 return out;
}
function render(){
 const svg=$('map');svg.replaceChildren();e('rect',{width:W,height:H,fill:'#edf3ee'},svg);
 const s=state.source;
 if(!s){const t=e('text',{x:500,y:355,'text-anchor':'middle',fill:'#59715e'},svg);t.textContent='산을 선택하면 기관 수록 등산로를 불러와';return}
 const stage=e('g',{id:'trails'},svg);
 const c=state.cam;stage.setAttribute('transform','translate('+c.x+' '+c.y+') translate(500 355) scale('+c.z+') translate(-500 -355)');
 if(s.kind==='preview'){
  if(s.previewPath)e('path',{d:s.previewPath,fill:'none',stroke:'#27774e','stroke-width':'2','vector-effect':'non-scaling-stroke'},stage);
 }else if(s.lines.length){
  const pr=project(s.lines);
  if(pr){
   const d=s.lines.map(x=>lineD(x.coords,pr)).join(' ');
   e('path',{d,fill:'none',stroke:'#267653','stroke-width':'2.3','stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke'},stage);
  }
 }
 if((s.kind==='preview'&&!s.previewPath)||(!s.lines.length&&s.kind!=='preview')){
  const t=e('text',{x:500,y:355,'text-anchor':'middle',fill:'#59715e'},svg);t.textContent='표시할 자료가 없어';
 }
}
function updateInfo(){
 const m=state.catalog.find(x=>x.code===state.code),s=state.source;
 if(!m||!s)return;
 $('selected').textContent=m.name;
 $('source').textContent=s.label+' · '+s.date;
 $('sourceDetails').textContent=s.note;
 $('sourceCount').textContent=s.kind==='preview'?m.segments.toLocaleString('ko-KR')+'개 원본 선형의 미리보기':
 s.sourceCount.toLocaleString('ko-KR')+'개 기관 수록 구간'+(s.lines.length!==s.sourceCount?' / 선형 부분 '+s.lines.length+'개':'');
 $('sourceProof').textContent='원본 출처 기록 / 2026 개방 여부 미확인 / 경로 자동 연결 불가';
 $('sourceProof').title='기관 수록 자료와 현행 이용 허가를 구분해 제공';
 $('routeHint').textContent='현재 연결망은 검증되지 않았어. 표시된 선형만으로 경로를 자동 생성하거나 거리·고도를 계산하지 않아.';
}
async function fetchJSON(path){
 const response=await fetch(path,{cache:'force-cache'});
 if(!response.ok)throw Error(path+': HTTP '+response.status);
 return response.json();
}
function loadIndex(){
 if(state.indexPromise)return state.indexPromise;
 state.indexPromise=fetchJSON('./data/nationwide/index.json').then(core.index).then(x=>(state.sourceIndex=x,x)).catch(e=>{
  console.warn('Historical detailed institution source shards unavailable',e);state.sourceIndex=null;return null;
 });
 return state.indexPromise;
}
async function loadInstitutional(code){
 const index=await loadIndex();if(!index||!index.mountains[code])return null;
 const bucket=index.mountains[code].bucket;
 if(!state.bucketCache.has(bucket)){
  state.bucketCache.set(bucket,fetchJSON('./data/nationwide/bucket-'+bucket+'.json').catch(e=>{
   console.warn('Shard unavailable, show agency source preview',bucket,e);return null;
  }));
 }
 return state.bucketCache.get(bucket);
}
async function select(code){
 const m=state.catalog.find(x=>x.code===code);if(!m)return;
 const generation=++state.generation;
 state.code=code;resetCamera();viewMountains();
 state.source=core.preview(code,m.name,state.previewPaths?.[code]);
 updateInfo();render();
 message(m.name+' 기관 수록 등산로 확인 중…');
 let official=null,rawAgency=null;
 if(code==='428302602'){
  try{official=await fetchJSON('./data/knps-seorak-2018.geojson')}catch(e){console.warn('KNPS sample fallback',e)}
 }else{
  rawAgency=await loadInstitutional(code);
 }
 if(generation!==state.generation)return;
 try{state.source=core.choose(code,{park:official,agencyData:rawAgency,previewPath:state.previewPaths?.[code]});
 }catch(e){
  console.warn('Source did not pass validation; using preview',e);
  state.source=core.preview(code,m.name,state.previewPaths?.[code]);
 }
 updateInfo();render();message(m.name+' · '+state.source.label+' 표시 중');
}
async function init(){
 try{
  state.catalog=core.catalog(window.SANBAK_NATIONAL_INDEX);
  const regions=[...new Set(state.catalog.map(x=>x.code.slice(0,2)))].sort();
  for(const code of regions){const option=new Option(regional[code]||code,code);$('region').add(option)}
  $('search').disabled=false;$('region').disabled=false;$('resultsCount').textContent='2,932개 산';
  viewMountains();
  await Promise.allSettled([loadIndex(),(async()=>{
   if(typeof DecompressionStream!=='function')throw Error('브라우저 gzip 미지원');
   const gz=window.SANBAK_NATIONAL_SVG_GZIP_BASE64;
   if(typeof gz!=='string'||gz.length<100000)throw Error('전국 미리보기 자료 없음');
   const bytes=Uint8Array.from(atob(gz),ch=>ch.charCodeAt(0));
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
   const data=JSON.parse(await new Response(stream).text());
   if(!data||Object.keys(data).length!==2932)throw Error('전국 원본 산코드 불일치');
   state.previewPaths=data;
  })()]);
  await select('428302602');
 }catch(err){console.error(err);message('전국 지도 초기화 오류: '+err.message)}
}
$('search').oninput=viewMountains;$('region').onchange=viewMountains;
$('fit').onclick=()=>{resetCamera();render()};
$('zoomIn').onclick=()=>{state.cam.z=Math.min(70,state.cam.z*1.4);render()};
$('zoomOut').onclick=()=>{state.cam.z=Math.max(.65,state.cam.z/1.4);render()};
$('map').addEventListener('wheel',ev=>{
 if(!state.source)return;ev.preventDefault();
 state.cam.z=Math.max(.65,Math.min(70,state.cam.z*(ev.deltaY<0?1.22:1/1.22)));render();
},{passive:false});
$('map').addEventListener('pointerdown',ev=>{
 if(!state.source)return;
 state.pointer={x:ev.clientX,y:ev.clientY,px:state.cam.x,py:state.cam.y};
 $('map').setPointerCapture(ev.pointerId);
});
$('map').addEventListener('pointermove',ev=>{
 if(!state.pointer)return;
 const rect=$('map').getBoundingClientRect();
 state.cam.x=state.pointer.px+(ev.clientX-state.pointer.x)*W/rect.width;
 state.cam.y=state.pointer.py+(ev.clientY-state.pointer.y)*H/rect.height;render();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('map').addEventListener(event,()=>state.pointer=null);
init();
})();
