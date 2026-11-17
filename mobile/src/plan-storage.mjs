/** Versioned local plan snapshots; never grants trail access or LNT consent. */
export const PLAN_SCHEMA = 1;
export const PLAN_KEY = 'sanbakmap:route-plans:v1';
const CODE = /^\d{9}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = s => typeof s === 'string' && DATE.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
export function validatePlan(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || p.schema !== PLAN_SCHEMA) throw Error('지원하지 않는 코스 파일');
  if (!CODE.test(p.mountainCode) || !['forest','knps'].includes(p.graphKind)) throw Error('산 코드 또는 자료 유형 오류');
  if (typeof p.sourceFingerprint !== 'string' || !/^[a-f0-9]{8}$/.test(p.sourceFingerprint)) throw Error('원본 검증값 누락');
  if (!Array.isArray(p.waypoints) || p.waypoints.length < 2 || p.waypoints.length > 30 || p.waypoints.some(n=>!Number.isSafeInteger(n)||n<0)) throw Error('경유지 목록 오류');
  if (p.planDate !== '' && !validDate(p.planDate)) throw Error('계획일 오류');
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) throw Error('코스명 오류');
  if (p.currentAccessVerified !== false || p.usableForNavigation !== false) throw Error('미검증 경로 안전 표기 누락');
  return {schema:PLAN_SCHEMA,name:p.name.trim(),mountainCode:p.mountainCode,graphKind:p.graphKind,sourceFingerprint:p.sourceFingerprint,waypoints:[...p.waypoints],planDate:p.planDate,currentAccessVerified:false,usableForNavigation:false};
}
export function graphFingerprint(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw Error('원본 그래프 없음');
  const data = JSON.stringify({nodes:graph.nodes,edges:graph.edges});
  let hash=2166136261;
  for(let i=0;i<data.length;i++){hash ^= data.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return (hash>>>0).toString(16).padStart(8,'0');
}
export function restorePlan(plan,{mountainCode,graphKind,graph,model}) {
  const p=validatePlan(plan);
  if(p.mountainCode!==mountainCode||p.graphKind!==graphKind||p.sourceFingerprint!==graphFingerprint(graph)) throw Error('저장 당시 원본과 현재 연결망이 달라 복원 불가');
  if(!model || p.waypoints.some(n=>n>=model.nodeCount||model.degreeOf(n)<=0)) throw Error('유효하지 않은 원본 노드');
  const route=model.plan(p.waypoints);
  if(route.status!=='geometry_preview_only' || !Array.isArray(route.legs) ||
     route.legs.length!==p.waypoints.length-1 ||
     route.legs.some(leg=>!Array.isArray(leg.edgeIds)||!leg.edgeIds.length))
    throw Error('원본 연결망에서 모든 경유지 구간을 확인할 수 없음');
  // A route may report geometry_preview_only while using inferred contacts.
  // Never restore it as a verified source-geometry route.
  const edgeIds=route.legs.flatMap(leg=>leg.edgeIds);
  if(edgeIds.some(id=>!Number.isSafeInteger(id)||id<0||id>=graph.edges.length||
      !graph.edges[id]||graph.edges[id].provisionalGap===true||
      graph.edges[id].unverified===true))
    throw Error('미확인 접합 또는 원본에 없는 경로가 포함되어 복원 불가');
  return [...p.waypoints];
}
export function readPlans(storage) {
  const raw=storage.getItem(PLAN_KEY);
  if(!raw)return [];
  const data=JSON.parse(raw);
  if(!Array.isArray(data)||data.length>100)throw Error('저장 목록 손상');
  return data.map(validatePlan);
}
export function savePlan(storage,plan) {
  const p=validatePlan(plan),all=readPlans(storage);
  if(all.length>=100)throw Error('저장 가능한 코스는 최대 100개');
  all.push(p);storage.setItem(PLAN_KEY,JSON.stringify(all));return all.length-1;
}
export function deletePlan(storage,index) {
  const all=readPlans(storage);
  if(!Number.isInteger(index)||index<0||index>=all.length)throw Error('잘못된 코스 번호');
  all.splice(index,1);storage.setItem(PLAN_KEY,JSON.stringify(all));return all;
}


/** Change only the planned date; never alter graph lineage, waypoints or access flags. */
export function updatePlanDate(storage,index,date) {
  const all=readPlans(storage);
  if(!Number.isInteger(index)||index<0||index>=all.length)throw Error('잘못된 코스 번호');
  const updated=validatePlan({...all[index],planDate:date});
  all[index]=updated;
  storage.setItem(PLAN_KEY,JSON.stringify(all));
  return updated;
}

/** Portable JSON plans are data only; importing never restores routes or grants access. */
export const PLAN_EXPORT_FORMAT = 'sanbakmap-route-plans';
export function exportPlans(storage) {
  const plans = readPlans(storage);
  return JSON.stringify({format:PLAN_EXPORT_FORMAT,version:1,plans},null,2);
}
export function importPlans(storage,json) {
  if(typeof json!=='string'||json.length>200000)throw Error('코스 파일 크기 오류');
  let file;
  try{file=JSON.parse(json)}catch{throw Error('JSON 파일 형식 오류')}
  if(!file||Array.isArray(file)||file.format!==PLAN_EXPORT_FORMAT||file.version!==1||!Array.isArray(file.plans)||file.plans.length>100)throw Error('지원하지 않는 코스 내보내기 파일');
  const incoming=file.plans.map(validatePlan);
  const existing=readPlans(storage);
  const key=p=>JSON.stringify([p.mountainCode,p.graphKind,p.sourceFingerprint,p.waypoints,p.planDate,p.name]);
  const known=new Set(existing.map(key));
  const additions=[];
  for(const plan of incoming){const k=key(plan);if(!known.has(k)){known.add(k);additions.push(plan)}}
  if(existing.length+additions.length>100)throw Error('저장 가능한 코스는 최대 100개');
  // Single atomic write: malformed input never partially modifies storage.
  if(additions.length)storage.setItem(PLAN_KEY,JSON.stringify([...existing,...additions]));
  return {imported:additions.length,skipped:incoming.length-additions.length};
}
