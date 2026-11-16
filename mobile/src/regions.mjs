/** Nationwide administrative choices are navigation labels, never place records. */
export const NATIONAL_REGIONS=Object.freeze([
 '서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'
]);
/** Always expose the 17 top-level regions; add subdivisions only from sourced records. */
export function nationwideCategoryRegions(records,category){
 const choices=new Set(NATIONAL_REGIONS);
 for(const record of records){
  if(record.category!==category||typeof record.region!=='string')continue;
  const parts=record.region.normalize('NFKC').trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
  for(let n=1;n<=parts.length;n++)choices.add(parts.slice(0,n).join(' '));
 }
 return [...choices].sort((a,b)=>a.localeCompare(b,'ko'));
}
