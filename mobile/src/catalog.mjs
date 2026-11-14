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
  // Reject coercible non-coordinate values (true, false, [], [37], objects).
  for(const value of [raw.lat,raw.lon]){
    if(typeof value!=='number'&&typeof value!=='string')throw new TypeError('Invalid coordinate type');
  }
  // Decimal degrees only: Number() otherwise accepts hex, binary and exponent notation.
  for(const value of [raw.lat,raw.lon]){
    if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))throw new TypeError('Invalid coordinate format');
  }
  const lat=Number(raw.lat),lon=Number(raw.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new TypeError('Invalid coordinates');
  const output={id:raw.id.trim(),name:raw.name.trim(),category,lat,lon,region:typeof raw.region==='string'?raw.region.trim().replace(/\s+/g,' '):'',source:typeof raw.source==='string'?raw.source.trim():'',checkedAt:typeof raw.checkedAt==='string'?raw.checkedAt.trim():''};
  if(category==='valley'){
    output.activity={};
    for(const key of VALLEY_ACTIVITIES){
      const item=raw.activity?.[key],status=item?.status??'unknown';
      if(!ACCESS_STATES.includes(status))throw new TypeError('Invalid activity status: '+key);
      const source=typeof item?.source==='string'?item.source.trim():'';
      const checkedAt=typeof item?.checkedAt==='string'?item.checkedAt.trim():'';
      // An allowed claim requires a nonblank source and a real ISO calendar date.
      const parsedDate=new Date(checkedAt);
      const validDate=/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)&&!Number.isNaN(parsedDate.getTime())&&parsedDate.toISOString().slice(0,10)===checkedAt&&checkedAt<=new Date().toISOString().slice(0,10);
      output.activity[key]=(status==='allowed'&&!(source&&validDate))?{status:'unknown',source:'',checkedAt:''}:{status,source,checkedAt};
    }
  }
  return output;
}
export function filterRecords(records,{category='',region='',search=''}={}){
  const term=String(search).trim().toLocaleLowerCase('ko-KR');
  return records.filter(r=>(!category||r.category===category)&&(!region||(r.region===region||r.region.startsWith(region+' ')))&&(!term||(r.name+' '+r.region).toLocaleLowerCase('ko-KR').includes(term)));
}

/** Keep verified records visible even if another source row is malformed.
 * Duplicate IDs are rejected rather than silently replacing a place. */
export function normalizeCatalog(rows){
  if(!Array.isArray(rows))throw new TypeError('Catalog must be an array');
  const records=[],rejected=[],ids=new Set();
  rows.forEach((row,index)=>{
    try{
      const record=normalizeRecord(row);
      if(ids.has(record.id))throw new TypeError('Duplicate place id');
      ids.add(record.id);
      records.push(record);
    }catch(error){rejected.push({index,reason:String(error.message)});}
  });
  return {records,rejected};
}

/** Province and full municipality choices, without inventing regions. */
export function regionOptions(records){
  const regions=new Set();
  for(const record of records){
    const full=typeof record.region==='string'?record.region.trim().replace(/\s+/g,' '):'';
    if(!full)continue;
    regions.add(full.split(' ')[0]);
    if(full.includes(' '))regions.add(full);
  }
  return [...regions].sort((a,b)=>a.localeCompare(b,'ko'));
}
