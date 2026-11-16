/** Distinguish missing verified category data from a genuine filtered-out result. */
export function emptyCatalogMessage({loadError='',records=[],category='',region='',search=''}={}) {
  if (loadError) return '장소 자료를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 접속하세요.';
  if (!records.some(record => record.category === category)) return '이 유형에 등록된 검증된 장소 자료가 아직 없습니다.';
  if (String(region).trim() || String(search).trim()) return '검색 조건에 맞는 장소가 없습니다.';
  return '표시할 장소가 없습니다.';
}
