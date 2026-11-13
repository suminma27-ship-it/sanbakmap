/** Sanbakmap common category contract; map data never implies permission. */
export const CATEGORIES = Object.freeze([
  {id:'mountain',label:'산',detail:'국립·도립·일반산'},
  {id:'island',label:'섬',detail:'여객선 운항 섬'},
  {id:'valley',label:'계곡',detail:'출입·물놀이·취사·야영 규정'},
  {id:'climbing',label:'암벽',detail:'자연 암장·루트'},
  {id:'trekking',label:'트레킹',detail:'종주·장거리·섬 트레킹'}
]);
export const ACCESS_STATES=Object.freeze(['unknown','allowed','restricted','prohibited']);
export const VALLEY_ACTIVITIES=Object.freeze(['entry','swimming','cooking','camping']);
export function normalizeRecord(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Invalid record');
  const category=String(raw.category??'');
  if(!CATEGORIES.some(c=>c.id===category))throw new TypeError('Invalid category');
  if(typeof raw.id!=='string'||!raw.id.trim()||typeof raw.name!=='string'||!raw.name.trim())throw new TypeError('Missing id or name');
  // Missing/null/blank coordinates must never silently become (0, 0).
  if(raw.lat===null||raw.lat===undefined||raw.lon===null||raw.lon===undefined||String(raw.lat).trim()===''||String(raw.lon).trim()==='')throw new TypeError('Missing coordinates');
  const lat=Number(raw.lat),lon=Number(raw.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new TypeError('Invalid coordinates');
  const output={id:raw.id.trim(),name:raw.name.trim(),category,lat,lon,region:typeof raw.region==='string'?raw.region.trim():'',source:typeof raw.source==='string'?raw.source.trim():'',checkedAt:typeof raw.checkedAt==='string'?raw.checkedAt.trim():''};
  if(category==='valley'){
    output.activity={};
    for(const key of VALLEY_ACTIVITIES){
      const item=raw.activity?.[key],status=item?.status??'unknown';
      if(!ACCESS_STATES.includes(status))throw new TypeError('Invalid activity status: '+key);
      const source=typeof item?.source==='string'?item.source.trim():'';
      const checkedAt=typeof item?.checkedAt==='string'?item.checkedAt.trim():'';
      // An allowed claim requires a nonblank source and a real ISO calendar date.
      const validDate=/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)&&!Number.isNaN(Date.parse(checkedAt))&&new Date(checkedAt).toISOString().slice(0,10)===checkedAt;
      output.activity[key]=(status==='allowed'&&!(source&&validDate))?{status:'unknown',source:'',checkedAt:''}:{status,source,checkedAt};
    }
  }
  return output;
}
export function filterRecords(records,{category='',region='',search=''}={}){
  const term=String(search).trim().toLocaleLowerCase('ko-KR');
  return records.filter(r=>(!category||r.category===category)&&(!region||r.region===region)&&(!term||(r.name+' '+r.region).toLocaleLowerCase('ko-KR').includes(term)));
}
