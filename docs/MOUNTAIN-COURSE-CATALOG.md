# 공통 산행코스 시스템

`mountain-courses.html?mountain=산코드`는 `core/mountain-courses.js`를 사용한다. 기존 `seorak-courses.html`도 동일 코드를 사용한다. `data/mountain-course-index.json`에 산코드·이름·catalogFile·선택적 referenceFile/center/zoom/sourceLabel/preferredRoute를 등록하면 된다. 코스 카탈로그는 기존 `sanbak-predefined-route-catalog-v1` 모델(산코드, 그룹, 이름, via, geometryFile, profileFile, 상태, 선택적 poiReference)을 유지한다. 미등록 산은 자료 준비 중으로 표시하며 설악산 자료로 대체하지 않는다. 코스 선형과 DEM은 원본 참고값으로 저장하며 동적 경로탐색은 하지 않는다. 새 파일을 배포할 때 workflow 패키지에 추가해야 한다. 현재 실데이터는 설악산만 등록되어 있다.
