# 산박지도 모바일 기본 기능 구현 상태

최초 기록: 2026-11-13 (KST)

## 목표 및 완료 게이트

- [x] 모바일 진입 HTML에서 매 접속 LNT 7원칙 동의, 거부 시 진입 차단 코드 구현 (실기기 검증 미완료).
- [ ] 전국 지도 중심 지역 선택 및 산·섬·계곡·암벽·트레킹 다섯 카테고리 검색.
- [ ] 각 카테고리 기본 목록/상세 화면 및 실재 출처 기록.
- [ ] 계곡별 출입·물놀이·취사·야영 각각 미확인/허용/제한/금지와 확인일 표기.
- [ ] 기존 산지도 진입 및 검증된 경로만 거리·고도에 반영.
- [ ] 모바일 웹 실기기 또는 브라우저 동작, 회귀 테스트 통과.
- [ ] 기본 기능 완료 후 전용 자동 개발 작업 정지 (Android/iOS 스토어 출시는 별도).

## 첫 개발 단계

- `mobile/` Capacitor 기반 Android/iOS 패키징 구조 존재; APK/IPA 실빌드 미검증.
- `mobile/src/catalog.mjs` 5개 카테고리, 좌표·이름 검증, 지역·카테고리·검색 필터, 계곡 활동 4종 상태 보수적 정규화 구현.
- `mobile/tests/catalog.test.mjs` 6개 단위 회귀 케이스 작성; `cd mobile && npm test` 실행 가능하도록 npm 스크립트 추가.
- 동일 알고리즘의 로컬 Node.js 테스트 6개 통과. GitHub Actions 실행/기기 검증은 별도 확인 필요.
- 위 데이터 구조는 실제 계곡 목록이 아니며 샘플 테스트 레코드는 출시용 데이터가 아니다.

## 안전 규칙

기존 산 지도 UI, 원본 그래프·DEM, 한계령 사용자 승인 예외 보존. 단순 35m 근접한 후보는 공식 탐방로로 승인하지 않음. 출입·물놀이·취사·야영 여부는 확인되지 않으면 `unknown`으로 표시하고 허용이라 추정하지 않음.

## 2026-11-13 자동 개발 실행 1

- `mobile/entry.html`에 LNT 7원칙, 사용자 합의 문구, 수락/거부 게이트 추가. 최초 로드 시 지도 iframe의 `src`는 비어 있어 지도가 로드되지 않고, 수락 시에만 `map.html`을 불러옴. 거부하면 해당 방문에서 수락 버튼 비활성화. 영구 동의 저장 없음.
- `mobile/src/lnt-gate.mjs` 순수 상태 전이 로직 및 `mobile/tests/lnt-gate.test.mjs` 5개 회귀 케이스 추가.
- `mobile/scripts/prepare-web.mjs`가 기존 `index.html`을 `map.html`로 복사한 후 모바일 LNT 진입 파일을 `index.html`로 배치하도록 수정. 기존 루트 지도 UI/원본 그래프/DEM 불변.
- GitHub 파일 읽기·코드 변경 확인 및 정적 코드 불변식 검사 수행. 로컬 런타임에서 GitHub DNS 해석 실패로 저장소 clone과 `npm test`/`npm run check:web` 실제 실행 불가. GitHub Actions의 새 커밋 실행 결과도 미확인. 따라서 이번 게이트는 **구현 완료 / 실행 검증 대기** 상태이며 MVP 완료로 판정하지 않음.

## 다음 단계

LNT 동의 게이트를 독립 모바일 진입점에 구현하고 테스트한 뒤, 기존 지도 엔진을 유지한 채 전국 지도·지역·카테고리 목록/상세를 연결한다. 실제 계곡 장소 데이터는 관광공사/지자체의 원본·이용 조건을 검증한 뒤 추가한다. 전국 데이터 정리 자동 작업은 이 프로젝트와 별도로 유지한다.


## 2026-11-13 자동 개발 실행 2

- 최신 `main`의 LNT 게이트, 기존 `index.html`, 모바일 패키저와 단위 테스트 구조를 확인.
- `mobile/catalog.html`에 다섯 카테고리 선택, 지역 필터, 이름 검색, 목록/상세 UI 추가. 계곡 상세에서 출입·물놀이·취사·야영의 미확인/허용/제한/금지와 출처·확인일을 개별 표시하도록 연결.
- LNT 동의 후 최초 진입을 `catalog.html`로 변경하고 기존 산 지도는 `map.html` 링크로 보존. 원본 지도·DEM·그래프·라우팅 코드 불변.
- `mobile/catalog.json`은 빈 배열. 허구 장소를 채우지 않았으므로 지역 필터의 실제 데이터 검증은 아직 불가. 실재 출처 확인 후만 데이터 추가.
- `mobile/scripts/prepare-web.mjs`에 카테고리 화면·데이터 패키징 추가, `mobile/tests/catalog-ui.test.mjs` 정적 회귀 4건 작성.
- 별도 로컬 Node 22에서 동등한 탐색 화면 구조 검사 9개 필수 토큰 및 빈 JSON 유효성 확인. **GitHub 원격 커밋의 전체 `npm test` 실행과 브라우저/Android 실기기 테스트는 미확인**. 로컬 컨테이너의 GitHub DNS 해석 실패로 원격 저장소 clone 검증 불가. 구현 완료를 MVP 완료로 오인하지 않음.

### 다음 우선순위
1. 원격 GitHub Actions에서 `mobile/npm test` 및 패키징 체크 실행 증거 확보.
2. 기존 공식 전국 산 데이터 색인과 공통 카테고리 탐색의 실제 연동.
3. 실재 출처 확인된 계곡·섬·암벽·트레킹 데이터의 최소 표본 추가. 이용 허가 미확인 기본값 유지.
4. 브라우저에서 LNT 수락/거부·목록·상세·지도 진입 검증 및 Android 패키징.


## 2026-11-13 자동 개발 실행 3

- 최신 `main`의 `mobile/catalog.html`, `entry.html`, `src/catalog.mjs`, 단위·UI 테스트, `scripts/prepare-web.mjs`, `package.json` 및 기존 `index.html` blob 존재를 GitHub API로 확인.
- `normalizeRecord`가 `null`·빈 문자열·누락 좌표를 `Number(...)=0`으로 변환해 허구의 (0,0) 지점을 생성할 수 있는 문제를 수정. 좌표 누락 시 명시적으로 거부하며 기존 5개 카테고리·계곡 4개 활동 상태는 유지.
- `mobile/tests/catalog.test.mjs`에 누락/공백/null 좌표 회귀 테스트 추가. 수정 함수에 대한 독립 JS 실행 검사 6개(누락·빈값 5개 거부 및 정상값/카테고리 보존) 통과. 전체 저장소 `npm test`는 아직 실행 결과 확인 전.
- `.github/workflows/mobile-mvp.yml` 신규 작성: Node 22에서 `npm test`, `npm run check:web`, `npm run prepare:web` 및 패키징된 LNT/탐색/지도 파일의 존재·게이트 구조 검사. **Actions 성공 결과는 아직 확인하지 않았으므로 CI 통과로 표시하지 않음.**
- 변경 커밋: `77255d35ee6e91bfaf7805c8e200acada41a4e37`, `8cbcc039a8bbb434f878644f04a5564c2275397e`, `597a065f7827391a627d1fb814813017e1dbd43f`.
- 기존 지도 UI, 원본 그래프/DEM, 한계령 예외, 35m 연결 후보 승인 규칙 불변. 전국 데이터 정리 자동 작업은 수정하지 않음.

### 다음 검증

1. GitHub Actions `Mobile MVP regression`의 실제 실행 및 오류 로그 확인, 통과 전에는 완료 판정 금지.
2. 출처 확인된 실제 장소의 최소 데이터, 지역 검색·상세의 브라우저 통합 검증.
3. LNT 동의/거부 후 직접 `map.html` 접근 같은 딥링크 우회와 모바일 앱 진입 경로의 안전성 점검.
4. 전국 산 지도 데이터 색인 연동, 실기기 또는 브라우저 지도 표시 검증, Android 패키징.


## 2026-11-14 자동 개발 실행 4

- 최신 `main`에서 `mobile/package.json`, LNT 진입점, 카테고리 화면, 데이터 정규화, 회귀 테스트, 모바일 CI 워크플로, Capacitor 설정 및 기존 진행표를 GitHub API로 확인.
- 계곡 이용 허용 상태의 근거 검증 결함 수정: 공백만 있는 출처나 허위 날짜(`2026-02-30`)가 있어도 `allowed`로 표시되던 위험을 차단. 허용은 출처가 비어 있지 않고 유효한 `YYYY-MM-DD` 달력 날짜가 있어야 유지하며, 불충분하면 `unknown`으로 강등. 제한/금지 상태는 임의 완화하지 않음.
- `mobile/tests/valley-evidence.test.mjs` 4개 회귀 테스트 추가. Node v22.16.0 로컬 독립 복제에서 4/4 통과. 전체 GitHub checkout/통합 `npm test`는 `github.com` DNS 실패로 불가능했고, 원격 CI 성공은 아직 확인되지 않음.
- 코드 커밋 `165f746e226fe2e5be69ae41e7864da190bb58dd`, 테스트 커밋 `d9e5b4bc9fa0632a76a626ac1a815d66b2e96e09`.
- 지도 UI·원본 그래프·DEM·한계령 예외·35m 후보 승인 규칙 및 별도 전국 데이터 정리 자동 작업 불변.

### 남은 합격 조건

실제 장소 출처/지역별 검색 통합 검증, LNT 딥링크 우회 안전성, 전국 산 데이터 색인 연동, GitHub Actions `npm test` 및 패키징 성공 증거, 브라우저·Android 실행 확인. 미완료이므로 자동 개발 계속 진행.


## 2026-11-14 자동 개발 실행 5

- 최신 main의 모바일 LNT 진입점, 카테고리 화면, Node 22 테스트 스크립트, 모바일 CI, Capacitor 패키징 스크립트와 기존 진행표를 GitHub API로 읽고 변경 범위를 결정.
- 계곡 '허용' 증거의 미래 날짜 결함 수정: 기존 유효한 달력 날짜만 검사하여 `2099-01-01` 같은 미래 날짜도 허용할 수 있었음. 이제 실제 ISO 달력 날짜이면서 실행일(UTC) 이하여야 허용하며, 미래 날짜는 `unknown` 처리. 기존 `restricted`/`prohibited`는 완화하지 않음.
- `mobile/tests/valley-future-date.test.mjs`에 미래 날짜·윤년·잘못된 형식·금지 유지 5개 회귀 사례 추가. 별도 Node 22.16.0 환경에서 동일 날짜 판정식 6개 독립 단언 통과. **저장소 전체 `npm test`는 GitHub DNS 해석 실패로 원격 checkout이 불가하여 미실행**. GitHub Actions 성공 및 실기기 테스트 역시 미확인. 향후 CI에서 새 회귀 테스트 실행 확인 필요.
- 코드 커밋 `dd6187e0ed7b8a91b8cba8995210716922e425b8`, 테스트 커밋 `76bfdc6c89500703db61660dbbc209c9f89ab1be`.
- 다음 단계: 모바일 Actions 실행 증거, LNT 딥링크 우회 정책 점검, 실제 장소 출처 확인, 전국 산 데이터 색인, 브라우저/Android 실기기 검증. 기본 기능 미완료.
- 기존 지도 UI·원본 그래프/DEM·한계령 예외·35m 후보 승인 규칙 및 별도 전국 데이터 정리 작업 변경 없음.

## 2026-11-14 자동 개발 실행 6

- 최신 main `9a73e7c77d16b2a7ad797cb2a101ac66a8ed8cc3`에서 모바일 진입점, 탐색 UI, 공통 데이터 모듈, 테스트, 패키저 및 CI 구성을 GitHub API로 확인한 후 작업.
- `mobile/src/catalog.mjs`: 목록 중 단일 레코드의 잘못된 좌표·형식 또는 중복 ID가 전체 목록을 중단시키던 결함을 격리하는 `normalizeCatalog` 추가. 정상 행만 유지하고 제외 행의 위치/사유를 기록. 없는 장소를 생성하거나 자동 승인하지 않음.
- `mobile/catalog.html`: 유효 행 표시 유지, 제외 건수 안내, 실제 JSON 로딩 실패 메시지 유지(기존 `render()`가 오류 메시지를 덮던 결함 수정).
- `mobile/tests/catalog.test.mjs`에 오류 행/중복 ID/비배열 입력 회귀 케이스 추가, `catalog-ui.test.mjs` 계약 갱신. 독립 JS 함수 실행 4행 사례에서 정상 2건/제외 2건 검증 및 HTML 정적 조건 3개 통과.
- 코드/테스트 커밋: `a2b13503fdaf082b44dd88a2dd4e129fb499a329`, `6f0c1f7f0759db6917cb7dc81c9f458f9518a871`, `a892feecb7710c4ab081ebc5beeaed96934fbd9c`, `7a47b63f20d75a425d0ddda66643b87969cabf8d`.
- **전체 저장소 `npm test`, GitHub Actions 실행, 모바일 브라우저/Android 실기기 검증은 이 실행에서 확인하지 못함.** 독립 로직 검증만 통과했으며 MVP 완료 판정 불가.
- 다음: CI 성공/실패 로그 확인, LNT 딥링크 우회 차단, 출처 검증된 실재 장소 데이터, 전국 산 색인 연동, 모바일 웹/Android 실제 실행 검증.
- 원본 지도 UI/그래프/DEM, 한계령 사용자 예외, 35m 후보 정책 및 별도 전국 데이터 정리 자동 작업 불변.

## 2026-11-14 자동 개발 실행 7

- GitHub main의 `mobile/catalog.html`, `src/catalog.mjs`, `entry.html`, LNT 게이트, 패키저, 테스트와 이전 상태 기록을 확인.
- 장소 좌표가 boolean/array/object일 때 JavaScript `Number()` 강제 변환으로 가짜 위치가 생길 수 있는 문제 수정. 숫자/문자열만 허용하며, 누락/비정상 값은 거부. 기존 5개 카테고리와 미확인 기본 정책 유지.
- GitHub에서 읽은 모듈 원문에 수정 사항을 적용한 JavaScript 함수로 비정상 타입 12건 거부와 정상 숫자 문자열 1건 허용, 총 13개 독립 실행 단언 통과. 회귀 테스트 `mobile/tests/catalog-coordinate-types.test.mjs` 3개 추가. 저장소 전체 `npm test`, GitHub Actions, 모바일 웹/Android 실기기 실행은 아직 미검증.
- 코드 커밋 `389098ff7d39c06997bd5ba0dbb3cbe381e364d3`, 회귀 테스트 커밋 `583a1f3ba67786878ca8478675ae6695160a8a1f`.
- 남은 완료 조건: LNT 딥링크 우회 차단 및 실제 브라우저 검증, 실제 출처 장소 데이터, 전국 산 색인/지도 연동, CI 전체 테스트 및 모바일 웹 실행 증거. 기존 지도·그래프·DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 작업 불변.

## 2026-11-14 자동 개발 실행 7

- 최신 main 커밋 `94cf38a5f720ece3becd6b4f21dd9e6d4b9a223e`와 모바일 패키징 설정, LNT 진입점, 카테고리 화면, 정규화 코드 및 기존 테스트를 GitHub 커넥터로 확인.
- 좌표 문자열을 `Number()`로 직접 변환하던 문제를 개선. `0x7f`, `0b101`, `1e2`처럼 10진 위경도 표현이 아닌 문자열을 거부하고, 정상 십진수와 부호·공백은 유지. 지도 데이터/그래프/DEM 변경 없음.
- 로컬 Node 22.16.0에서 동일 정규식·숫자 변환 로직을 분리한 독립 테스트 2건 통과. 저장소 전체 `npm test` 및 웹 패키징은 로컬 `github.com` DNS 해석 실패로 실행하지 못함. 신규 회귀 테스트 `mobile/tests/catalog-decimal-format.test.mjs` 작성했으나 전체 CI 결과 미확인.
- 코드 커밋 `56aa062acec65a76198b11de2b1a306a65151868`, 회귀 테스트 커밋 `5ae814d0a48cf15454f26a203363ad967b33ea98`.
- 미완료 합격 기준: 실제 출처가 있는 5개 카테고리 탐색/지역 검색/상세, LNT 딥링크 우회 점검, 전국 산 색인 및 검증 경로 연결, 브라우저 모바일 웹 실행과 전체 회귀/CI 및 Android 빌드 확인. 전국 데이터 정리 자동 작업은 별도로 유지.


## 2026-11-14 모바일 LNT 직접 접근 방어 (후속 실행)

- `mobile/catalog.html`에서 최상위 창 직접 접근 또는 부모 LNT 게이트가 잠긴 상태의 접근을 `./index.html`로 돌리는 방어 코드를 추가. 이미 동의한 `mobile/entry.html`의 iframe 접근은 유지.
- `mobile/tests/catalog-entry-gate.test.mjs`에 직접 접근, 잠긴 부모, 동의한 부모의 세 가지 자동 회귀 시나리오 추가. Node v22.16.0에서 동일 조건의 독립 실행 검사 3/3 통과. 저장소 전체 `npm test` 및 브라우저 통합 실행은 아직 미확인.
- 코드 커밋 `5286c0888dd0e8d751da1e20a171d36ae14b5561`, 테스트 커밋 `de8d43d5d74aecc443552589d053fa13067492fc`.
- **제한:** 이 조치는 카탈로그 직접 진입만 방어하며 `map.html` 직접 URL 접근까지 차단하지 않는다. 또한 클라이언트 측 게이트는 서버 권한 통제가 아니므로 LNT 완전 우회 방지라고 판정하지 않는다.
- 남은 합격 기준: 패키징된 `map.html` 직접 진입 통제, 전체 Node 회귀 및 모바일 웹 실행 검증, 실제 장소 출처·전국 산 색인·지역 검색·상세 연동, Android 검증. 기존 원본 지도/그래프/DEM, 한계령 예외, 35m 미승인 후보, 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-14 모바일 지도 직접 진입 방어

- GitHub main 최신 커밋과 `mobile/scripts/prepare-web.mjs`, `entry.html`, `catalog.html`, `package.json`, 기존 카탈로그 게이트 테스트를 확인. `mobile/map.html`은 원본 저장소에 없으며 패키징 시 루트 `index.html`에서 생성됨.
- `mobile/src/map-guard.mjs`를 추가하고 패키저가 **복사본** `www/map.html`의 head 선두에 동기식 LNT 진입 검사를 삽입하도록 수정. 최상위 직접 진입, 미동의 부모, 교차 출처 부모는 `./index.html`로 이동. 동의한 `entry.html` iframe에서는 지도 표시 허용. 원본 루트 `index.html`과 그래프·DEM·경로 데이터는 수정하지 않음.
- `mobile/tests/map-entry-gate.test.mjs`에 5개 자동 회귀 테스트 추가. Node 독립 환경에서 동일 코드/테스트 5/5 통과 (직접 진입, 미동의, 교차 출처, 동의, 이중 삽입/누락 head 거부). 저장소 전체 `npm test`, `prepare:web`, GitHub Actions 및 브라우저 실동작은 아직 미검증: 컨테이너 `git clone` 시 `Could not resolve host: github.com`.
- 관련 커밋: `bbe22129e7eb6bec86470dab28e24059f9237c97`, `17b35123fab642a4045926bcc31c2589546f59d0`, `aec0471afdd6de272bd107a0c071fd5c1dd4d8c3`.
- 다음 합격 기준: CI에서 실제 패키징된 map 게이트 검사 및 전체 회귀 통과, 모바일 브라우저 직접/iframe 탐색 검증, 실재 출처 장소 데이터, 전국 산 색인/검증 경로 연동, Android 빌드. 클라이언트 LNT 게이트는 서버 접근제어가 아니며 실제 통행 허가를 뜻하지 않음. 별도 전국 데이터 정리 작업과 스케줄 불변.

## 2026-11-14 모바일 CI 실패 원인 수정

- GitHub Actions `Mobile MVP regression` 실행 [43511990378](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43511990378)의 실제 job 로그 확인: Node 테스트 40개 중 39개 통과, `valley-evidence.test.mjs`의 `valid allowed evidence preserved and trimmed` 1개 실패. 이후 패키징 단계는 건너뜀.
- 실패 원인: 테스트에서 `2026-11-14`를 이미 지난 확인일로 가정했으나 GitHub Actions는 UTC `2026-11-13 21:35`에 실행되어 날짜 검증이 미래 날짜로 올바르게 강등함. 제품 코드 결함이 아닌 시간대 의존 테스트 데이터 결함.
- 테스트의 정상 허용 사례 날짜만 `2020-01-01`로 수정. 실제 출입 허용 데이터가 아니라 테스트용 가상 레코드이며 출시 목록에 추가하지 않음. 원래의 미래 날짜 차단 정책 유지. 수정 전 실패 로그 확인 및 동일 검증식 Node 독립 실행 단언 통과. **수정 커밋 이후 GitHub Actions 전체 테스트/패키징 성공은 아직 확인 전**.
- 남은 합격 기준: 새 커밋 CI 40개 회귀 및 패키징 성공 확인, 모바일 브라우저 직접/iframe 동작, 실재 출처 장소 데이터, 전국 산 색인·지역 검색·상세, Android 검증. 기존 지도/원본 그래프/DEM/한계령 예외/35m 후보 및 별도 전국 데이터 정리 자동 작업 변경 없음.


## 2026-11-14 카테고리 공통 이용 상태 표시

- `mobile/catalog.html` 상세에서 산·섬·암벽·트레킹도 출입·물놀이·취사·야영 4종을 모두 `미확인`으로 표시하도록 수정. 계곡만 출처·확인일 검증을 거친 개별 상태를 유지. 장소 허용 여부를 추정하거나 가짜 데이터를 추가하지 않음.
- `mobile/tests/all-category-permission-ui.test.mjs`에 다섯 카테고리·네 상태 표시 계약 회귀 테스트 추가.
- GitHub 원문 기반 치환·정적 검증 통과. 원격 GitHub Actions/전체 `npm test` 및 브라우저 실행 결과는 아직 확인하지 못했으므로 합격 처리하지 않음.
- 코드 커밋 `a944b312e25e7de9dc62ce1502963c44e3611e00`, 테스트 커밋 `324f22a5fad8c7743315ed2999af833297931d5a`.
- 다음 합격 조건: 전체 CI 성공, 실제 출처 장소 데이터, 전국 산 색인, LNT 포함 모바일 웹 실행 및 Android 패키징 검증. 기존 지도·원본 그래프/DEM·한계령 예외·35m 후보 및 별도 전국 정리 작업 불변.


## 2026-11-14 지역 선택 개선 (실행 09:33 KST)

- 최신 main `5e57ddadc249c8dcb21e8f1b7ed2530b767d5aba`, `mobile/src/catalog.mjs`, `mobile/catalog.html`, 패키징 스크립트, 기존 단위 테스트 및 이력 확인.
- 실제 장소의 지역 값이 `강원특별자치도 춘천시`처럼 시군구까지 포함될 때 지역 드롭다운이 시군구별로 쪼개지는 문제를 개선: 첫 공백 구분 토큰(시도)을 선택지로 제공하고, 정확한 지역 또는 `시도 + 공백` 접두어만 매칭. 잘못된 부분 문자열 매칭은 거부.
- 독립 JavaScript 필터 실행 단언 3건 통과(시도 2개 시군구, 전체 지역 정확 매칭, 부분 문자열 거부). `mobile/tests/catalog-region.test.mjs`에 Node 자동 회귀 3건 추가. **새 테스트의 실제 Node 실행 및 전체 npm test/CI/모바일 브라우저 검증은 미확인**. 로컬 저장소 clone은 `github.com` DNS 해석 실패로 차단됨.
- 코드 커밋 `c697ae41c32e0778c35b064c5b3c8bbb933fefa1`, `a3ba42f4ead77e6dc7da58375993da99536aa3fc`; 테스트 커밋 `7e7e4e55514533b0d5e52ecb70df640a9f9ce696`.
- **남은 합격 기준**: 실제 출처 장소와 전국 산 색인 연동, 5개 카테고리의 실데이터 지역/상세 확인, LNT 브라우저 우회 회귀, 전체 CI/웹 패키징 및 모바일 웹 실행, Android 검증. 현재 `catalog.json`은 빈 목록이므로 실제 지역 검색은 아직 검증할 수 없음.
- 기존 지도/UI·원본 그래프/DEM·한계령 예외·35m 연결 정책 및 별도 전국 데이터 정리 자동 작업 변경 없음.


## 2026-11-14 지역 공백 정규화 후속 검증

- `main` 최신 커밋 및 `mobile/catalog.html`, `entry.html`, `src/catalog.mjs`, `scripts/prepare-web.mjs`, `package.json`, 지역 필터 테스트를 GitHub 커넥터로 확인. `mobile/index.html`은 원본에 없으며 패키징 시 `entry.html`에서 생성되는 구조 유지.
- 실제 지역 문자열에 연속 공백·탭·줄바꿈이 섞이면 시·도 선택이 누락되는 문제를 막기 위해 `normalizeRecord`에서 지역 공백을 단일 공백으로 정규화. 산·섬·계곡·암벽·트레킹 카테고리 및 허용 상태 판단 로직 불변.
- `mobile/tests/catalog-region.test.mjs`에 정규화된 시·도/시군구 검색 회귀 케이스 추가. 동일 정규화식의 독립 JS 입력 3건 통과. **전체 `npm test`와 패키징·브라우저 실행은 미검증**: 로컬 `git ls-remote`가 `Could not resolve host: github.com`으로 실패하여 원격 체크아웃 불가. 테스트 커밋 후 GitHub Actions 통과도 아직 확인하지 못함.
- 코드 커밋 `de4d6d1daf6b4013f1c50de0a6a1a0edbd8d61fc`, 테스트 커밋 `90929e6233e946ecad2917bc63820bc92fa88bb3`.
- 남은 완료 조건: 실제 출처 장소 데이터와 전국 산 색인, 다섯 카테고리 지역/상세 브라우저 통합 검증, LNT 직접 진입 검증, 전체 회귀·모바일 웹 실행, Android 빌드. 기존 지도 UI·원본 그래프/DEM·한계령 예외·35m 후보 및 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-14 지역 선택 시군구 확장

- `main` 최신 커밋 `dfcd8a4dd3e022f7eda525d7059b30f555968c69` 및 `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `package.json`, 테스트, 패키징 스크립트를 GitHub 커넥터로 확인.
- 실재 목록의 지역 문자열에서 시·도와 전체 시군구 선택지를 중복 없이 생성하는 `regionOptions` 추가. 기존 시·도 검색은 유지하고 전체 시군구 선택 시 해당 지역만 필터링. 빈 지역은 선택지에 추가하지 않으며 허구 장소는 생성하지 않음.
- 독립 Node v22.16.0에서 동일 `regionOptions` 구현의 2개 테스트 통과(중복/정렬, 공백 정규화). 저장소에 `mobile/tests/region-options.test.mjs` 3개 회귀 테스트 추가; **신규 테스트 포함 전체 `npm test`는 미실행**. 로컬 `git ls-remote`는 `Could not resolve host: github.com`으로 실패. GitHub Actions와 모바일 브라우저 검증도 미확인.
- 코드/테스트 커밋 `f5c703637dd397ab861efbb6b71aef6b910b78a4`, `f0454f397a9b9a7f6ade11db06955ed392c0bc1d`, `49ae47eef68a6204de3f8f0e3a36179b361de7be`.
- 남은 완료 게이트: 실제 출처 장소 데이터, 전국 산 색인/검증 경로 연동, 전체 회귀 및 패키징 CI 성공, LNT 포함 모바일 웹 브라우저 실행과 Android 빌드. 원본 지도/그래프/DEM, 한계령 예외, 35m 후보 정책, 별도 전국 데이터 정리 작업/스케줄 변경 없음. 기본 기능 미완료.


## 2026-11-14 지역 검색 공백 정규화 검증

- 최신 main의 `mobile/src/catalog.mjs`, `catalog.html`, 테스트, 패키저, 기존 지도 `index.html` 존재 및 진행표를 GitHub 커넥터로 확인.
- 지역/이름 검색에서 사용자 입력의 연속 공백·앞뒤 공백과 데이터 공백 표현 차이로 실제 장소가 누락되는 문제를 `filterRecords`에서 수정. 시·도 경계에 해당하지 않는 부분 문자열은 지역 일치로 간주하지 않음. 기존 다섯 카테고리, LNT 게이트, 지도/그래프/DEM, 한계령 예외, 35m 후보 정책 불변.
- 독립 JavaScript 검사 3/3 통과: 시·도 전체 + 이름 검색, 시군구 정확 선택, 부분 지역명 오탐 차단. `mobile/tests/catalog.test.mjs`에 같은 동작의 자동 회귀 1개(3개 단언) 추가.
- 코드 커밋 `0f391328509635b7ad94280703a4acc2e61349cb`, 회귀 테스트 커밋 `db3e15f2a8d2c7429168a0c0a88db97e04bce182`. **전체 저장소 npm test, GitHub Actions 성공, 모바일 브라우저/Android 실제 실행은 이번 단계에서 미확인**. 독립 검사를 전체 회귀 통과로 간주하지 않음.
- 남은 합격 조건: 실재 출처 장소 데이터와 전국 산 색인 연동, LNT/목록/상세/지도 모바일 브라우저 통합 검증, 전체 회귀 및 패키징 CI 통과, Android 실빌드. 전국 데이터 정리 자동 작업은 변경하지 않음.

## 2026-11-14 시군구 3단계 지역 필터 검증

- GitHub main의 mobile/ 진입점, catalog UI/모듈, 테스트, prepare-web 및 루트 지도 프로토타입을 읽고 지역 계층 누락을 확인.
- 실제 장소 주소가 `경상남도 창원시 성산구`처럼 3단계일 때 기존 `regionOptions`는 도 전체와 구 전체만 제공해 중간 `경상남도 창원시`를 선택할 수 없었음. 각 주소의 실제 공백 구분 접두 구간을 모두 생성하도록 수정. 존재하지 않는 지역·장소는 추가하지 않음.
- 코드 커밋 `3e11c8f1139e5fbbe805a8e6cdf6ba67720d555e`, 테스트 커밋 `f5dfa6f5bd66e18a1eadd8ddac4ece730829f842`. 테스트 3개: 3단계 옵션, 단계별 필터 일치, 불완전한 시명 오탐 방지.
- 독립 JS 접두 구간 단언 1건 통과. 실제 저장소 전체 `npm test`와 `prepare:web`는 `git ls-remote`에서 `Could not resolve host: github.com`으로 checkout 불가하여 미실행. 신규 테스트의 실제 실행 및 CI 결과는 확인 전.
- 다음 합격 조건: GitHub CI 전체 회귀/패키징 성공, LNT 동의/거부와 직접 지도 URL의 브라우저 검증, 실재 출처 장소 자료 및 전국 산 색인 연결, 모바일 웹/Android 실행. 다섯 카테고리 및 미확인 기본값 유지. 원본 지도·그래프·DEM·한계령 예외·35m 후보 정책과 별도 전국 데이터 정리 작업 불변. **MVP 미완료**.


## 2026-11-14 모바일 개발 실행 6 (14:37 KST)

- 최신 main 커밋 `14c9703` 및 `mobile/package.json`, `mobile/src/catalog.mjs`, `mobile/catalog.html`, `mobile/tests/catalog.test.mjs`, `mobile/entry.html`, `mobile/scripts/prepare-web.mjs`, 기존 `index.html` 존재를 GitHub API로 확인.
- 장소 목록을 한국어 이름 가나다순으로 정렬하도록 순수 함수 `sortRecordsByName` 추가 및 목록 UI에 연결. 원본 데이터 순서를 변경하지 않음. 산·섬·계곡·암벽·트레킹, LNT 게이트, 기존 지도/DEM/그래프 불변.
- 정렬 및 원본 불변성을 확인하는 Node 회귀 테스트 추가. 독립 JS `localeCompare('ko')` 샘플 3개 순서 확인 통과. **신규 회귀 테스트 전체 실행 결과는 미확인**.
- 코드/화면/테스트 커밋: `43f0f75`, `258ec0b`, `2f915cf`. GitHub API 파일 업데이트 성공. 컨테이너 `git ls-remote`는 `Could not resolve host: github.com`으로 실패하여 clone 및 `npm test`/브라우저 검증 불가. CI/모바일 웹 실행 성공으로 간주하지 않음.
- 남은 완료 게이트: 출처 확인된 실재 장소 최소 데이터, 전국 산 색인, LNT 수락/거부 및 목록/상세/지도 브라우저 통합 테스트, `npm test` 및 `prepare:web` 실행, Android 패키징 확인. 기본 기능 미완료. 별도 전국 데이터 정리 작업 변경 없음.


## 2026-11-14 장소 출처 누락 표시 차단 (15:36 KST 실행)
- 최신 main 및 `mobile/src/catalog.mjs`, `mobile/catalog.html`, 테스트, 패키징 스크립트, 빈 `catalog.json` 확인.
- 공개 탐색에서는 `normalizeCatalog(data,{requireSource:true})`를 적용해 출처가 비어 있거나 공백뿐인 장소를 목록/상세에서 제외. 제외 건수는 기존 안내에 포함. 내부 가져오기·테스트의 기본 정규화 동작은 유지.
- 회귀 테스트에 출처 누락/공백 거부, 출처 있는 행 유지, 기본 호환성 4가지 단언 추가. 로컬 Node 22.16.0에서 동등한 격리 로직 4개 단언 통과. **실제 저장소 전체 `npm test`, `prepare:web`, 브라우저 및 Android 실행은 미확인**: 로컬 git ls-remote가 `Could not resolve host: github.com`으로 실패. GitHub Actions 결과도 별도 확인 필요.
- 커밋: `93426ed791b71b5e56dd78db8a8ac11314009049`, `16c615dee4606d3bcf38d8179a1d981ca3f4e7cb`, `df731fe7442a04c52fdb1db38b0eb50194274e42`.
- 주의: 비어 있지 않은 출처 문자열은 **실제 출처의 진위 검증이 아님**. 공식 원문·좌표·이용 규정을 대조하기 전 데이터 수록 승인 금지.
- 남은 합격 기준: 실재 출처 검증 데이터, 전국 산 색인, 5개 카테고리 지역/상세 실데이터 확인, LNT 모바일 브라우저 회귀, 전체 CI/웹 패키징 성공, Android 실행. 지도/그래프/DEM·한계령 예외·35m 후보 및 별도 전국 정리 자동 작업 불변.


## 2026-11-14 장소 확인일 보수적 표시

- GitHub의 최신 `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `prepare-web.mjs`, 기존 테스트 및 이 문서를 읽고 변경. 원본 지도·DEM·그래프에는 손대지 않음.
- 장소 수준 `checkedAt`에 잘못된 달력 날짜(예: 2026-02-30), 미래 날짜(2099-01-01), 비표준 날짜가 있어도 기존 UI가 검증일처럼 보여주던 문제 수정. 유효한 과거 ISO 날짜만 유지하고 나머지는 공백(상세에서 '미확인') 처리.
- 독립 Node 22에서 날짜 판정 5개 입력 검사 통과. `mobile/tests/catalog-place-date.test.mjs`에 회귀 3개 추가. 전체 `npm test` 및 모바일 브라우저 실행은 저장소 checkout 불가(`Could not resolve host: github.com`)로 **미검증**. GitHub 커넥터를 통한 소스 읽기/커밋은 성공.
- 코드 `fd0af9f39a9ffbef76365c66c1fb47a4f78bf7b1`, 회귀 테스트 `2f722cecc7893def60bbacd97bb71450042a6dcb`.
- 남은 합격 조건: LNT 수락/거부 및 직접 진입 브라우저 통합, 다섯 카테고리의 실제 출처 장소·지역 검색·상세, 전국 산 색인과 기존 지도/검증 경로 연동, 전체 자동 테스트/CI 및 모바일 웹·Android 검증. 미완료.
- 별도 전국 데이터 정리 작업 및 일정, 한계령 예외, 미승인 35m 후보, 원본 그래프/DEM 변경 없음.


## 2026-11-14 검색 유니코드 정규화 검증

- main의 모바일 카탈로그, LNT 진입점, 패키징 스크립트, 단위 테스트와 최근 커밋 확인 후 `filterRecords`의 검색어/지역 문자열에 NFC 정규화를 추가. 조합형/분해형 한글의 동일 장소 검색 누락 방지. 카테고리 5종, 원본 데이터, 지도/DEM 및 권한 상태 불변.
- 독립 JavaScript 정규화 단언 3/3 통과. `mobile/tests/catalog-unicode-search.test.mjs`에 분해형 한글 장소·지역 검색 및 부분 지역명 오탐 방지 회귀 추가. 코드 커밋 `e72b625cca2af2b3c0d9734e853da7f67e513020`, 테스트 커밋 `fa04bcbced1a01bdc2f7529e1fde30734a51a849`.
- 전체 `cd mobile && npm test`, `npm run prepare:web`, GitHub Actions 및 모바일 브라우저/Android 실행 성공은 이번 실행에서 검증하지 못함. 독립 검사만으로 MVP 완료 판정 불가.
- 남은 합격 기준: 실제 출처가 확인된 다섯 카테고리 장소·지역 검색·상세, 전국 산 색인/기존 지도 경로 연동, LNT 브라우저 통합 검증, 전체 자동 회귀 및 모바일 웹 실행 증거. 별도 전국 데이터 정리 작업·스케줄 변경 없음.


## 2026-11-14 활동 상태 확인일 표시 검증

- GitHub main의 모바일 진입점, 카탈로그 정규화/화면, 테스트, 패키저와 상태 문서를 확인. 계곡의 `restricted`/`prohibited` 상태에서 잘못된 달력 날짜 또는 미래 날짜를 확인 완료일로 그대로 표시하던 결함 수정.
- 유효하지 않은 활동 확인일은 빈 값(화면에서 '미확인')으로 정규화하되, **제한/금지 상태 자체는 보존**. 허용 상태의 출처·날짜 검증 및 미확인 기본값 유지. 실제 장소 데이터 추가 없음.
- 동일 판정식의 독립 실행 5건 통과(잘못된 날짜, 미래 날짜, 정상 과거 날짜, 허용 강등, 미확인). `mobile/tests/activity-date-display.test.mjs`에 4개 자동 회귀 케이스 추가. **저장소 전체 npm test, GitHub Actions 및 모바일 브라우저/Android 실행 결과는 이 실행에서 확인하지 못함**.
- 코드 커밋 `f31cdfc7b413858b6e88f3533980349f012eca80`, 테스트 커밋 `39a3586da7cfc60589f8425a0805f9cb899cded2`.
- 남은 합격 조건: 실제 출처 있는 장소 데이터, 전국 산 색인·지도 연결, 5개 카테고리 실데이터 탐색, LNT/지도 브라우저 검증, 전체 CI/웹 패키징 및 Android 실행. 기존 지도·원본 그래프/DEM·한계령 예외·35m 후보 및 별도 전국 데이터 정리 자동 작업 변경 없음.

## 2026-11-14 모바일 장소 ID 유니코드 충돌 방어

- GitHub main 최신 커밋과 `mobile/package.json`, `entry.html`, `catalog.html`, `src/catalog.mjs`, `scripts/prepare-web.mjs`, 카탈로그 테스트, 기존 `index.html` 존재 및 상태 문서를 확인.
- `normalizeCatalog`의 중복 ID 비교를 NFC 정규화하여 조합형/분해형 한글 ID가 서로 다른 장소로 중복 게시되지 않게 수정. 원본 ID 표기는 보존하며 두 번째 중복 행만 검증 실패로 격리. 신규 허구 장소 추가 없음.
- `mobile/tests/catalog-unicode-id.test.mjs` 회귀 테스트 추가. Node 독립 NFC 중복 판정 단언 통과. 전체 저장소 `npm test`와 `prepare:web`은 컨테이너의 `github.com` DNS 해석 실패로 checkout 불가하여 미실행; GitHub Actions 결과 및 브라우저/Android 실동작 미확인.
- 코드 커밋 `467818c066372370117c3018c591b1c1732725d7`, 테스트 커밋 `91223ce878b075856717ff0f32c9ba9eb00a5a9e`.
- 남은 합격 기준: LNT 게이트 모바일 웹 실제 실행, 5개 카테고리 출처 확인 데이터/지역 검색/상세, 전국 산 색인·기존 지도 진입, 전체 회귀·패키징·배포 확인. 기존 지도/원본 그래프/DEM/한계령 예외/35m 후보 정책과 별도 전국 데이터 정리 작업 불변. MVP 미완료.


## 2026-11-14 모바일 패키징 산출물 회귀 강화

- 최신 main 및 `mobile/` 진입점·카탈로그·패키저·지도 가드·테스트·CI를 GitHub 커넥터로 확인.
- `.github/workflows/mobile-mvp.yml`의 패키징 검증을 확장: LNT 동의 전 iframe src 부재, 패키징 지도 head 선두 가드, **원본 `index.html`과 가드 삽입본의 완전 일치**, 카탈로그 모듈 연결 및 원본/패키징 카탈로그 JSON 일치를 자동 단언. 원본 지도·그래프·DEM·UI는 수정하지 않음.
- 워크플로 정적 구조 검토 및 원본 `guardMapHtml` 호출 계약 확인. 실제 GitHub Actions 실행 성공 여부는 미확인. CI 검증 커밋 `bcebbd64cf65dc64a0e08c9080dac76bbde2cdd9`, 비교 방식 수정 `0835352659bef24a216ffb0ff72fee1035714ac9`.
- **남은 합격 조건:** CI 전체 `npm test`·패키징 실행 성공 로그, LNT 브라우저 동작, 출처 확인된 실제 다섯 카테고리 장소 및 전국 산 색인/지역 검색/상세, 기존 산 지도/거리/고도 연동 검증, 모바일 웹·Android 실행. 전국 데이터 정리 자동 작업과 한계령 예외·35m 미승인 후보 정책 불변.


## 2026-11-14 장소 확인일 출처 결합 검증 (21:34 KST)

- `main` 최근 커밋, `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `scripts/prepare-web.mjs`, `package.json`, CI 및 테스트를 GitHub 커넥터로 확인.
- 장소 수준 `checkedAt`에 유효한 과거 날짜만 있고 출처가 없더라도 검증일처럼 노출되던 문제를 수정. 출처가 비어 있으면 확인일은 미확인으로 유지. 계곡별 제한/금지와 별도 활동 근거는 변경하지 않음.
- 정상 과거 날짜/출처, 출처 누락, 공백 출처, 비정상 달력 날짜, 미래 날짜 등 독립 JS 판정 5건 통과. `mobile/tests/catalog.test.mjs` 회귀 케이스 추가. 저장소 전체 `npm test`, GitHub Actions, 브라우저/Android 실행은 이번 실행에서 확인하지 못함.
- 기능 커밋 `6900e9900580f915ca9c7ffa2734c5310d1bf8bc`, 테스트 커밋 `e1f73fcdc6f79ccb5061b6e73d70edd0e92abf5e`.
- 남은 합격 기준: 5개 카테고리 실재 출처 장소/지역 검색/상세, LNT 및 지도 진입 모바일 웹 통합 실행, 전국 산 색인과 검증 경로 연동, 전체 회귀/패키징 성공 증거. 원본 지도·그래프·DEM·한계령 예외·35m 후보 및 별도 전국 데이터 정리 작업은 변경하지 않음. MVP 미완료.


## 2026-11-14 모바일 탐색 오류 상태 분리

- `mobile/catalog.html`에서 자료 로딩 실패, 검색 결과 0건, 실제 카탈로그 빈 배열을 각각 다른 안내 문구로 표시하도록 수정. 네트워크 오류를 '검증된 장소 자료 없음'으로 오인하지 않도록 함.
- 원격 파일 SHA 확인 후 기존 문자열 한 곳만 교체; 변경 후 구문 존재/이전 구문 부재 정적 검사 및 세 상태 분기 독립 JS 단언 3건 통과. 코드 커밋 `425d917b40c46134cd313afc986da9847c8998ad`.
- 전체 `npm test`, 패키징, 브라우저/Android 실행 및 GitHub Actions 성공은 이번 실행에서 검증하지 못함. Actions 실행 목록 조회는 GitHub fetch 허용 URL 제약(HTTP 400)으로 실패. 따라서 MVP 완료 아님.
- 다음 합격 기준: 실제 출처 있는 장소 데이터 및 지역검색, 전국 산 색인, LNT/지도 딥링크 브라우저 회귀, 전체 테스트·웹 패키징·Android 실행 증거.
- 기존 지도/UI 본체, 그래프/DEM, 한계령 예외, 35m 후보 및 전국 데이터 정리 자동 작업은 변경하지 않음.


## 2026-11-14 카탈로그 재시도 기능 (23:36 KST)

- GitHub main의 `mobile/catalog.html`, `entry.html`, `src/catalog.mjs`, `scripts/prepare-web.mjs`, `package.json`, 기존 테스트 및 진행표를 읽음. `mobile/index.html`은 원본에 없고 웹 패키징 시 생성됨.
- 카탈로그 JSON 요청 실패 시 기존에는 오류 문구만 있고 재시도 동작이 없었음. 오류 상태에서만 '다시 불러오기' 버튼을 노출하고 성공 시 오류를 해제하며 지역 선택지를 새 데이터 기준으로 다시 생성하도록 변경. 이전 지역이 여전히 존재하면 선택을 유지. 데이터 없음과 네트워크 실패를 구별하고 허구 레코드를 만들지 않음.
- 변경 전후 정적 계약 검사(로더 교체, 오류 초기화, 지역 옵션 중복 제거, 재시도 이벤트 연결) 통과. `mobile/tests/catalog-retry.test.mjs`에 Node 자동 회귀 2건 추가. **새 테스트 및 전체 `npm test` 실제 실행은 미검증**: 로컬 `git ls-remote`가 `Could not resolve host: github.com`으로 실패. GitHub 커넥터 파일 읽기/쓰기만 가능했으며 브라우저·Android 실기기 검증도 미실행.
- 코드 커밋 `df5f12697b2a5a80672d933c97624db9a53aaa4e`, 테스트 커밋 `5218557b4a28a5207c3562c67fe4357a089d8ec7`.
- 남은 합격 조건: GitHub Actions 전체 회귀/패키징 성공, LNT 및 카탈로그 모바일 브라우저 실행, 실재 출처 장소 데이터, 전국 산 색인/검증 경로 연동, Android 빌드. 기존 지도·원본 그래프/DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 자동 작업 변경 없음. 기본 기능 미완료.


## 2026-11-15 모바일 카탈로그 재시도 실패 시 오래된 장소 제거

- 최신 main과 `mobile/catalog.html`, `mobile/src/catalog.mjs`, `mobile/entry.html`, `mobile/scripts/prepare-web.mjs`, `mobile/package.json`, 기존 재시도 회귀 테스트 확인.
- 이전 성공 응답의 장소 목록이 남은 상태에서 다음 JSON 요청이 실패하면 화면에 오래된 장소가 표시될 수 있는 결함 수정. 실패 시 `records=[]`, `rejectedCount=0`으로 초기화하고 오류 및 재시도 버튼을 유지. 장소·허용 상태를 새로 생성하지 않음.
- 기능 커밋 `f34960c5286a865d32988b995620b21ab7d6869a`, 회귀 테스트 커밋 `dc0be8f0689372cec88a5de159d4258f8bf44077`. GitHub에서 재조회한 코드/테스트 정적 계약 4개 통과. 별도 Node 상태 전이 독립 검사 통과. 신규 Node 테스트 전체 실행, GitHub Actions 및 모바일 웹 브라우저 실행 결과는 미확인; 이를 통합 테스트 성공으로 취급하지 않음.
- 남은 합격 조건: 실재 출처 장소 및 전국 산 색인, 다섯 카테고리의 지역/상세 실데이터 검증, LNT 포함 브라우저 지도 진입, 전체 npm 회귀·패키징 CI 성공, Android 실빌드. 기존 지도 UI·원본 그래프/DEM·한계령 예외·35m 후보 정책과 별도 전국 데이터 정리 자동 작업 불변. MVP 미완료.


## 2026-11-15 모바일 카탈로그 로딩 실패 시 지역 상태 초기화

- `main` 최신 모바일 카탈로그·LNT 진입점·지도 패키저·공통 정규화 모듈·테스트와 기존 상태 기록 확인. 출처 없는 출시용 장소 데이터(`mobile/catalog.json=[]`) 유지.
- 로딩 실패 후 이전 지역 선택지가 남아 다음 재시도 시 필터가 오래된 지역을 가리킬 수 있는 문제 수정: 실패 시 기존 레코드/제외 건수와 함께 지역 선택지를 `전국` 하나로 초기화. 재시도 시 정상 응답에서 지역 선택지를 다시 생성하며, 기존 지도·DEM·그래프는 불변.
- 변경 커밋: `31405d7215349945cfc5b642d203169d6ef4ff38`, 회귀 테스트 커밋: `db3685916074412f510b40eb9ea860519f44b228`.
- GitHub에서 변경 후 코드/테스트를 재조회하여 실패 분기·초기화 조건·회귀 테스트·다섯 카테고리·LNT 카탈로그 게이트·기존 지도 링크에 대한 정적 검사 6/6 통과. 입력 blob: `baba61aef49f92ebd57b857aa123d1471c63c553` 및 `7dd8a062bc4fac6d6a65f4448fa0543b052b6e3d`.
- 저장소 전체 `npm test`, 브라우저 통합 실행, GitHub Actions 성공 여부 및 Android 실기기 검증은 이번 실행에서 확인하지 못했으므로 완료 판정 불가.
- 남은 합격 조건: 실재 출처의 다섯 카테고리 데이터/지역 검색·상세, 전국 산 색인/지도 및 검증 경로 연동, LNT 동의/거부·딥링크 브라우저 검증, 전체 회귀/패키징 및 모바일 웹 실행. 비공식 35m 후보 승인 금지, 한계령 예외·원본 데이터 보존, 전국 데이터 정리 자동 작업 변경 없음.


## 2026-11-15 모바일 카탈로그 재시도 경쟁 상태 수정

- 최신 main의 `mobile/catalog.html`, `mobile/entry.html`, `mobile/src/catalog.mjs`, `mobile/scripts/prepare-web.mjs`, `mobile/package.json`, 기존 테스트 및 진행 이력을 확인.
- `loadCatalog()` 요청에 증가하는 시퀀스 번호를 도입. 재시도 요청이 겹칠 때 이전 요청의 늦은 성공/실패가 최신 장소 목록·지역 선택·오류 표시를 덮지 않도록 결과 반영 전에 최신 요청인지 확인.
- 회귀 테스트 `mobile/tests/catalog-stale-request.test.mjs` 추가. GitHub에서 변경 파일을 다시 읽어 시퀀스 가드와 테스트 정규식 일치를 정적으로 확인. 저장소 전체 `npm test`, 브라우저 동시 요청 통합 테스트, GitHub Actions, Android 빌드의 성공 증거는 아직 확보하지 못함. **전체 통과로 판정하지 않음.**
- 코드 커밋 `a40a914efed0c4d2ff2d7c058cc69fcf7444efd4`, 테스트 커밋 `91636883f368ba7fd2de7d71b3c3d3f9d7a5173e`.
- 남은 합격 기준: 실재 출처 장소 및 전국 산 색인 연동, 5개 카테고리 지역 검색·상세의 실제 데이터 검증, LNT 및 지도 진입 브라우저 검증, 전체 자동 회귀·모바일 웹 실행, Android 패키징. 기존 지도 UI·그래프·DEM·한계령 예외·35m 후보 정책과 별도 전국 데이터 정리 작업은 변경하지 않음.


## 2026-11-15 자동 개발 실행 — LNT iframe 신원 검증

- 최신 main의 `mobile/entry.html`, `catalog.html`, `src/map-guard.mjs`, 패키징 스크립트·테스트·CI 및 원본 `index.html` 존재를 확인.
- 동의한 부모 페이지의 CSS 클래스만 검사하면 별도 동일 출처 페이지가 해당 클래스를 흉내 내 우회할 수 있는 문제를 줄이기 위해, 카탈로그와 패키징된 지도 양쪽에서 `parent.document.getElementById('app') === window.frameElement` 조건을 추가. 직접 URL 진입·다른 iframe·거부 상태는 게이트로 되돌림. 원본 루트 지도는 수정하지 않음.
- `mobile/tests/lnt-frame-identity.test.mjs`에 카탈로그/지도 각각 정상·직접 진입·잠김·다른 iframe·부모 접근 예외 5가지 실행 회귀 케이스 추가. 별도 Node 로컬에서 동등한 상태 조건 6건 통과. 저장소 전체 `npm test`, GitHub Actions, 실제 모바일 브라우저 실행은 아직 성공 확인 전이며 이번 변경의 전체 통합 검증으로 간주하지 않음.
- 코드 커밋 `5fbb548bfdb41ea44669b36b9338c32201560e48`, `3ae9561e4d50cf004ce358c5560b755f600b2a05`; 테스트 `eee9da46cb14a124871252ba106d96685c158519`.
- 남은 합격 기준: CI 전체 테스트와 패키징 성공, 실제 브라우저 LNT 수락·거부·딥링크 검증, 출처가 있는 다섯 카테고리 데이터·지역 검색·상세, 전국 산 색인 및 검증 경로 지도 연동, 모바일 웹 실행 확인. 네이티브 빌드/실기기 확인은 별도 미완료. 원본 그래프/DEM·한계령 예외·35m 후보 및 전국 데이터 정리 자동 작업 불변.


## 2026-11-15 모바일 카탈로그 LNT 검증 전 화면 노출 차단 (04:28 KST)

- GitHub main 최신 커밋, mobile/entry.html, catalog.html, src/catalog.mjs, scripts/prepare-web.mjs, package.json, 기존 테스트와 루트 index.html 존재를 확인. mobile/index.html은 원본이 아닌 패키징 생성물.
- 카탈로그의 초기 HTML이 iframe LNT 검증 완료 전에 순간적으로 표시될 수 있는 문제를 줄이기 위해 기본 body를 숨기고, 올바른 부모 동의 상태와 iframe 신원이 모두 확인된 분기에서만 표시. 직접 URL/부모 오류/거부 시 기존 게이트 리다이렉트 유지. 다섯 카테고리, 원본 지도, 그래프/DEM 및 산 데이터 불변.
- 코드 커밋 9a59cc6a3c1cda8e01be07d9f1d5872ce120d1de, 테스트 커밋 6af80062734959ebeb97ff6505fa96cfa27eb306. 입력 코드 blob 7e8739a4a12cb4cb40daead2a126fbb8a0a15d4c, 결과 코드 blob 70cb21472b63d069c2835a040712dec58c6aa66b, 신규 테스트 blob 7b2a45ad409688d041d68fc4f64238219c48ce16. 수정 전후 5개 정적 계약 조건 통과 및 GitHub 재조회 확인. 신규 Node 테스트 및 전체 npm test, GitHub Actions, 모바일 브라우저 실측은 이번 실행에서 수행/확인하지 못했으므로 통과로 간주하지 않음.
- 남은 합격 기준: LNT 수락·거부·딥링크 실제 브라우저 검증, 출처 있는 다섯 카테고리 실데이터와 지역/상세, 전국 산 색인 및 검증 경로 지도 연동, 전체 자동 회귀/모바일 웹 실행, Android 패키징. 한계령 예외·비공식 35m 후보 정책·전국 데이터 정리 자동 작업 변경 없음. 기본 기능 미완료.


## 2026-11-15 모바일 장소 근거 플레이스홀더 차단

- 최신 main의 `mobile/src/catalog.mjs`, `mobile/catalog.html`, `mobile/entry.html`, `mobile/scripts/prepare-web.mjs`, `mobile/package.json`, `mobile/tests/catalog.test.mjs` 및 본 상태 기록 확인.
- 장소 출처가 `미확인`, `unknown`, `N/A`, `없음` 등 플레이스홀더여도 게시 카탈로그에 들어가거나 계곡 `allowed` 근거로 인정될 수 있던 문제 수정. NFKC/공백/대소문자 정규화 후 차단; 제한/금지는 완화하지 않음. 허구 장소 추가 없음.
- 소스 변경 커밋 `d4cdf48140fbe25d2a1c958276a053b8d5d82173`, 정규식 수정 `a0a1f9c099c189413e81807a2617b5e258afaaf3`; 회귀 테스트 추가 `4d2fdec86fed6b6f173c25754d98ab7ed3180121`, 테스트 문구 정정 `0024e5a44a11ded4743c870ea870393431c1ed1b`. 결과 소스 blob SHA `a31621779198af8e6a0ad85ecc23bd346d7e6d60`, 테스트 blob SHA `ad62dac2c1b9bb815238aa1b90bbd7a0a35b31ec`.
- Node 22.16.0에서 동일 근거 판정 함수 독립 단언 8/8 통과. **전체 저장소 `npm test` 및 `npm run check:web`은 로컬 `github.com` DNS 해석 실패로 checkout 불가하여 미검증**. 원격 GitHub Actions·모바일 브라우저·Android 실기기 실행도 확인하지 못함. 독립 검사만 통과한 변경이므로 통합 합격 판정 금지.
- 다음 합격 기준: 전체 회귀 및 패키징 CI 실행 증거, 실제 출처 장소와 지역 검색/상세 통합, 전국 산 색인과 검증 경로, LNT 모바일 웹 동작 확인. 원본 지도/그래프/DEM, 한계령 예외, 35m 후보 및 별도 전국 데이터 정리 작업 불변. MVP 미완료.


## 2026-11-15 출처 미확인 표기 우회 보완

- 최신 `main`의 모바일 패키징 스크립트, LNT 진입점, 카테고리 UI, 데이터 모듈 및 테스트 계약 확인. `mobile/index.html`은 원본에 없고 패키징 시 생성됨.
- `hasEvidenceSource`가 `N/A.`, `UNKNOWN.`, `미 확인`, `확인-안됨` 등의 미확인 표기를 출처로 인정하던 결함 수정. 구두점·공백 정규화 후 미확인 표기를 거부하며 출처가 없는 장소 게시와 계곡 `allowed` 상태를 차단.
- 독립 JavaScript 입력 11건(거부 8, 실제 출처 형식 유지 3) 통과. `mobile/tests/catalog-evidence-markers.test.mjs`에 게시 데이터/활동 허용 회귀 추가. 코드 커밋 `cdaeb6016548b7eefee179518eec0e8eaca6e5d9`, 테스트 커밋 `85d4d4f333646adb9049ce49ba521131f25c7378`.
- 로컬 GitHub clone은 DNS 오류 `Could not resolve host: github.com`로 불가능. 전체 `npm test`, 패키징, 브라우저 및 Android 실행은 이번에 검증하지 못했으므로 MVP 미완료. 실제 장소 출처 데이터, 전국 산 색인, 경로/고도 연동, CI 및 모바일 웹 실동작 검증 필요.
- 기존 지도 UI·원본 그래프/DEM·한계령 예외·35m 후보 승인 정책 및 별도 전국 데이터 정리 자동 작업 불변.

## 2026-11-15 모바일 출처 보류표기 차단

- 최신 main 및 mobile 패키징·카탈로그 모듈·테스트·기존 지도 진입을 GitHub에서 확인. 원본 index.html/그래프/DEM은 수정하지 않음.
- `mobile/src/catalog.mjs`의 출처 검사에 `TBD`, `TODO`, `pending`, `unverified`, `추후 확인`, `확인 예정`, `출처 없음` 등의 보류 표기를 추가. 구두점·공백 정규화 후 거부하며 장소 게시 및 계곡의 근거 없는 `allowed` 표시 모두 차단.
- `mobile/tests/catalog-source-pending.test.mjs` 회귀 테스트 추가. Node 22.16.0에서 동일 판정 로직의 독립 단언 9건 통과. GitHub 저장소 전체 `npm test`, CI, 브라우저/Android 실행은 이번 단계에서 확인하지 못했으므로 통과로 표시하지 않음.
- 입력 blob SHA-1: `mobile/src/catalog.mjs` `d6af5550da312ade8a52b40bfba2ba6c28b4a1ac`; 결과 blob SHA-1: `36fe006adb7e2ad62a359aff938fbd7cd4bdfcd7`. 코드 커밋 `dde26464688d7477fa2f45aade0a9d7b733746bf`, 테스트 커밋 `137c99b6f4437d151f0a91dc9a2201ea9c957a3e`.
- 미완료: 실제 출처 검증된 장소 데이터, 전국 산 색인/지역 검색 및 검증 경로 연동, LNT 모바일 웹 통합 검증, 전체 자동 회귀/CI, Android 빌드. 별도 전국 데이터 정리 자동 작업·스케줄 불변.


## 2026-11-15 LNT 뒤로가기 캐시 복원 차단

- 최신 `main` 트리에서 `mobile/entry.html`, `mobile/catalog.html`, `mobile/src/lnt-gate.mjs`, `mobile/src/catalog.mjs`, `mobile/package.json`, 기존 테스트 및 원본 `index.html` 확인. `mobile/catalog.json`은 빈 배열이며 실제 장소 수집·전국 산 색인 연동은 미완료.
- `mobile/entry.html`에 `pageshow`/`event.persisted` 처리 추가. 브라우저 뒤로/앞으로 캐시에서 동의 완료 페이지를 복원하면 iframe `src` 제거, `unlocked` 해제, LNT 상태 초기화 및 수락/거부 버튼 재활성화. 일반 최초 `pageshow`는 변경하지 않음. 별도 회귀 테스트 `mobile/tests/lnt-bfcache-restore.test.mjs` 추가.
- 변경 전 entry blob `8d4511dd55f8d98e2c987cc59c0865151eb2f0e4`, 변경 후 `59e969134868f97510e045fe41a0ef866875d366`. 코드 커밋 `ee273871fa207c4a0fe8368a75c1a3776c04cc8b`, 테스트 커밋 `286f49fd040841a1310e8b8a99bbe9b351199d73`. 로컬 Node에서 동등한 캐시 복원 상태 전환 단언 5개 통과; **새 저장소 테스트 파일 자체의 실행과 전체 `npm test`는 미확인**. `git clone` 시 `Could not resolve host: github.com`으로 로컬 checkout 불가. GitHub 커넥터를 통해 코드 반영.
- 미완료 합격 기준: 실제 모바일 브라우저의 bfcache/직접 진입/LNT 거부 검증, 출처 확인된 다섯 카테고리 장소 데이터 및 지역·상세 검색, 전국 산 지도/검증 경로·고도 연동, 전체 회귀/모바일 웹 패키징, Android 빌드. 원본 지도·그래프·DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 자동 작업은 수정하지 않음. 기본 기능 미완료.

## 2026-11-15 출처 보류 표기 구두점 우회 차단

- GitHub main 최신 이력 및 `mobile/src/catalog.mjs`, `mobile/catalog.html`, `mobile/entry.html`, `mobile/scripts/prepare-web.mjs`, 테스트·패키징 구조 확인.
- `hasEvidenceSource`에서 `TODO:`, `(미확인)`, `[pending]`, `출처 없음?`처럼 구두점으로 감싼 미확인 표기가 실재 출처로 인정되던 문제를 수정. `mobile/tests/catalog-placeholder-punctuation.test.mjs`에 게시 거부 및 정상 출처 회귀 테스트 추가.
- Node.js 독립 동일 판정식 10개 단언 통과. 수정 소스 blob `a7476f215c1090d7d85424716b08416ada577de4`; 코드 커밋 `9ccb696ffb430d9ada30fb7db801f18739de4c47`, 테스트 커밋 `6c6a61f5e6128571b7de9bb1c3f49653d06ea3fe`.
- 로컬 GitHub clone은 `Could not resolve host: github.com`으로 실패. 따라서 저장소 전체 `npm test`, GitHub Actions, 실제 모바일 웹 및 Android 패키징 통과는 이번 실행에서 확인하지 못함. 독립 단언만 통과한 것으로 기록.
- 다음 합격 기준: CI에서 신규 테스트 포함 전체 회귀·웹 패키징 성공 확인, 실제 출처 장소 데이터·전국 산 색인 및 검증 경로 연동, 브라우저 LNT/검색/상세/지도 실행 검증. 원본 지도·그래프·DEM·한계령 예외·35m 후보 승인 규칙과 별도 전국 데이터 정리 작업은 변경하지 않음. MVP 미완료.


## 2026-11-15 모바일 좌표 센티널 검증

- GitHub main 최신 커밋과 `mobile/package.json`, `entry.html`, `catalog.html`, `src/catalog.mjs`, `scripts/prepare-web.mjs`, `tests/catalog.test.mjs`, 루트 지도 `index.html` blob 및 기존 상태 문서를 확인.
- `mobile/src/catalog.mjs`에서 좌표 `(0,0)` 또는 문자열 `'0','0'`을 실제 한국 장소로 게시하지 않도록 거부. 정상 좌표와 기존 5개 카테고리·이용 미확인 정책 유지. 기존 지도/그래프/DEM/한계령 예외 및 35m 후보 승인 정책은 변경하지 않음.
- 원격 소스 원문을 사용한 JavaScript 독립 실행 검증 5건 통과: 숫자·문자열·음수 0 센티널 3건 거부, 정상 좌표 1건 보존, 혼합 목록 정상 1건/제외 1건 검증. `mobile/tests/catalog.test.mjs` 회귀 케이스 추가.
- 코드 커밋 `5d115584444fdf4601283cdafa1cc61926dab166`, 테스트 커밋 `ebcad9fca04b01fc8499981615bc9d409b140691`. 전체 저장소 `npm test`, Actions 성공, 브라우저·Android 실기기 실행은 이 실행에서 검증하지 못했으므로 완료 판정 불가.
- 다음 합격 기준: 전체 회귀/패키징 실행 성공 증거, 실재 출처 장소 최소 데이터와 지역 검색·상세 브라우저 검증, 전국 산 색인·검증 경로 거리/고도 연동, LNT/지도 진입 실동작, Android 빌드. 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-15 모바일 카탈로그 배포 전 검증

- GitHub main의 모바일 디렉터리, LNT 진입점, 탐색 화면, 카탈로그 정규화, 패키저, 테스트 목록과 기존 상태 기록을 확인.
- `mobile/scripts/prepare-web.mjs`의 `--check` 및 실제 패키징 경로에서 `mobile/catalog.json`을 JSON 파싱하고 `normalizeCatalog(...,{requireSource:true})`를 실행하도록 추가. 출처 누락·잘못된 좌표·중복 ID 등의 거부 행이 하나라도 있으면 패키징을 실패시켜, 화면에서 조용히 제외된 장소가 배포되는 문제를 방지. 빈 카탈로그는 유효하지만 데이터 완료로 간주하지 않음.
- `mobile/tests/catalog-package-gate.test.mjs`에 실제 출시 JSON 검증과 오류 행 3종 회귀 테스트 추가. 원격 GitHub에서 변경 파일을 다시 읽어 blob SHA를 확인했고, 로컬 Node 22에서 동등한 독립 시나리오 2/2 통과. **저장소 전체 `npm test`와 `npm run check:web`는 GitHub clone의 `Could not resolve host: github.com` 장애로 실행하지 못함. 새 GitHub Actions 성공 여부도 미확인.**
- 코드 커밋 `076aad1a1a1f0650dd715db7a4c4a3b801bdb351`, 테스트 커밋 `b2d4b0fc50cb3147e7ab9e4405c825b69bdadaa3`. 원본 지도/그래프/DEM/한계령 예외/35m 미승인 후보 및 별도 전국 정리 자동 작업 불변.
- 남은 합격 조건: 전체 CI 및 실제 모바일 웹 실행, LNT 동의/거부와 지도 딥링크 브라우저 검증, 실재 출처의 다섯 카테고리 장소/지역검색/상세, 전국 산 데이터·검증 경로/거리/고도 연동, Android 빌드 확인. 기본 기능 미완료.

## 2026-11-15 출처 보류 표기 차단

- main의 모바일 카탈로그·LNT 진입점·패키징 스크립트·기존 단위 테스트·빈 catalog.json을 확인. 원본 지도/그래프/DEM은 변경하지 않음.
- `mobile/src/catalog.mjs`에서 '확인 중', '검토 중', '조사 중', '자료 없음', '출처 미상', '미정'을 실제 출처로 오인하지 않도록 추가 차단. 산·섬·계곡·암벽·트레킹 5종 모두 동일 적용. 허구 장소·허용 상태 생성 없음.
- GitHub 원문에서 추출한 변경 후 `hasEvidenceSource` 함수를 실행해 보류 표기 8건 거부와 유효 형식 예시 3건 유지, 총 11/11 단언 통과. 신규 `mobile/tests/catalog-provenance-placeholders.test.mjs` 추가. **저장소 전체 npm test, 신규 테스트 파일 직접 실행, 패키징·브라우저·Android 검증은 미실행**: 컨테이너 `git ls-remote`가 `Could not resolve host: github.com`으로 실패. 독립 함수 검증만으로 전체 회귀 합격을 주장하지 않음.
- 코드 커밋 `702fe9908ae6f52a290e86fb39f60b4b17e78fb0`, 회귀 테스트 커밋 `58e9b3658b5014c9a443185efb0f4d13b4e4512d`. 출처 문자열의 존재는 출처 진위·현장 허용 검증을 대신하지 않음.
- 남은 합격 기준: 실제 출처 대조한 5개 카테고리 최소 데이터, 전국 산 색인과 검증 경로 연동, LNT/지역/상세/지도 모바일 웹 통합 실행, 전체 Node 회귀·패키징 CI, Android 빌드. 전국 데이터 정리 자동 작업과 일정 변경 없음. **MVP 미완료**.


## 2026-11-15 계곡 이용 상태 출처 검증 강화

- 최신 main의 mobile 카탈로그 모듈, 테스트, LNT 진입, 탐색 화면, 패키징 스크립트 및 빈 catalog.json 확인.
- 기존에는 계곡의 allowed만 출처/날짜를 강제하고 restricted/prohibited는 근거 없이 표시할 수 있었음. 이제 unknown을 제외한 모든 상태에 출처 및 유효 확인일을 요구하며 미충족 시 unknown으로 보수적 강등. 근거가 있는 상태는 보존.
- 독립 JavaScript 상태 판정 12개 입력 확인. 자동 회귀 테스트 1건(3개 상태×근거 누락·placeholder·미래 날짜·유효 근거) 추가. 전체 npm test/패키징/브라우저 실측은 미실행: 컨테이너 git ls-remote가 github.com DNS 해석 오류로 실패. 독립 단언을 전체 회귀 통과로 간주하지 않음.
- 코드 커밋 466db9d02f3f5fabc8577d84bdea6d4544109fa9, 테스트 커밋 ca25446b4002e43c1424af3178d4cfd46af21e27. 원본 지도·DEM·그래프·한계령 예외·35m 후보 및 전국 데이터 정리 자동 작업 불변.
- 남은 합격 기준: 실제 출처가 검증된 5개 카테고리 최소 장소 데이터와 전국 산 색인, 지역/상세·LNT·지도 모바일 웹 브라우저 통합 실행, 전체 npm test 및 웹 패키징 성공, Android 빌드 확인. MVP 미완료.


## 2026-11-15 모바일 출처 보류 접두어 차단 (15:36 KST)
- main의 모바일 카탈로그 모듈, LNT 진입점, 목록/상세 화면, 패키저, 테스트 및 빈 catalog.json을 확인. GitHub 소스 blob SHA (변경 전 catalog.mjs): `89d014187d8a68a567144b641995301da96700f9`.
- `TODO: 관리기관 확인`, `검토 중 - 출처 추가`, `확인 예정: 국립공원` 등 보류 접두어 뒤에 임의 문자열이 붙어도 출처로 인정되던 오류를 보수적으로 차단. 허구 장소나 출입 허용 상태는 추가하지 않음.
- Node.js 22.16.0에서 수정 판정식의 독립 10개 입력 단언 통과(최초 시도에서 공백 포함 '검토 중' 누락 발견 후 정규식 보완 및 재검증). 저장소 자동 회귀 파일 `mobile/tests/catalog-source-prefix.test.mjs` 추가. **전체 npm test 및 신규 테스트의 저장소 내 실행은 미검증**: `git ls-remote`가 `Could not resolve host: github.com`으로 실패. 모바일 웹/Android 실동작 및 Actions 성공도 미확인.
- 코드 커밋 `19606c6e5376c7c9a97c89c4a43f7ce2a3986ab9`, 테스트 커밋 `06f1d4902c73a1fd6d95016b3d3fb695b97f83e7`. 출처 문자열의 형식 검사는 공식 자료의 진위 검증을 대신하지 않음.
- 남은 합격 기준: 실제 출처 대조된 5개 카테고리 장소, 전국 산 색인/검증 경로·거리·고도 연동, LNT 수락/거부 및 직접 진입 브라우저 검증, 전체 npm test/패키징 CI 성공, 모바일 웹 실행 및 Android 검증. 기존 지도/UI·그래프·DEM·한계령 예외·35m 미승인 후보 및 별도 전국 정리 자동 작업 변경 없음. 기본 기능 미완료.


## 2026-11-15 16:33 KST — CI 실패 10건 원인 확인 및 회귀 테스트 정비

- `main` 기준 GitHub Actions [43686283639](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43686283639)의 실제 job 로그를 확인: Node 91개 중 81개 통과, 10개 실패. 패키징 단계는 미실행.
- 원인: 기존 테스트의 LNT iframe 부모 `#app` 동일성 mock 누락(3건), 미확인 근거를 가진 금지/제한 상태를 확정으로 기대하는 구 정책(4건), 카탈로그 비동기 로딩 순서 보호 `loadSequence` 도입 후 구형 문자열 패턴 검사(2건), iframe 테스트에서 문서 mock 누락(1건). 제품 코드의 LNT 우회나 허용 상태를 완화하지 않고 9개 테스트 파일의 기대값과 mock만 최신 계약에 맞게 수정.
- 테스트 수정 커밋: `f398427d`, `6642542f`, `b283637c`, `43413d8f`, `03a2accb`, `b23951a3`, `c6bc3650`, `c08d9b7a`, `b33a804d`. 최신 [모바일 CI 실행 43690603348](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43690603348)은 이 기록 시점 진행 중이므로 통과 주장 불가. 컨테이너 직접 checkout은 `Could not resolve host: github.com`으로 불가.
- 완료 기준: CI에서 전체 Node 회귀 및 `prepare:web` 성공, 패키징된 LNT 게이트/지도 확인, 모바일 브라우저 실동작, 실제 출처가 있는 다섯 카테고리 장소, 전국 산 색인/검증 경로·고도 연동, Android 빌드. 아직 미완료.
- 원본 지도/UI·그래프·DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 자동 작업/스케줄 변경 없음.

- CI 후속: 실행 `43690603348`은 91개 중 90개 통과/1개 실패(동의된 iframe의 `document.body.style.visibility` mock 누락). 테스트 환경만 보완한 커밋 `73ac9156`; [후속 CI 43690640700](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43690640700) 결과 확인 전. 제품 코드 변경 없음.


## 2026-11-15 출처 보류 문구 확장 차단
- 최신 `mobile/src/catalog.mjs`, `mobile/catalog.html`, `entry.html`, `package.json`, 패키징 스크립트 및 기존 출처 테스트를 GitHub에서 확인. 게시용 `mobile/catalog.json`은 여전히 빈 배열.
- `자료 없음: 담당자 확인`, `출처 없음 - 보류`, `미정: 확인 예정`처럼 보류 문구 뒤에 설명이 붙은 출처를 거부하도록 출처 검사식을 보완. 기존 정상 출처 문자열을 허용하는 7개 독립 정규식 사례 검증 통과(거부 5, 허용 2). 새 회귀 사례를 기존 `catalog-source-prefix.test.mjs`에 추가.
- 코드 `29582b6152cb2c58d4dc41ae802065de9526b798`, 테스트 `f679b53a895026faabc64714cf9fb011559cb58e`. 전체 `npm test`, 웹 패키징 및 모바일 브라우저/Android 실기기 실행은 이번 변경에 대해 아직 확인되지 않았으므로 완료 판정 불가.
- 남은 합격 기준: GitHub Actions 전체 회귀/패키징 성공, 출처 검증된 실제 다섯 카테고리 장소 데이터, 전국 산 색인·검증 경로/고도 연동, LNT 수락·거부·딥링크 모바일 웹 실행, Android 빌드 검증. 원본 지도/그래프/DEM·한계령 예외·35m 후보 및 별도 전국 데이터 정리 작업 불변.


## 2026-11-15 18:36 KST — 최신 모바일 CI 통합 검증 확인

- GitHub `main`의 `mobile/` 구조, `entry.html`, `catalog.html`, `src/catalog.mjs`, `scripts/prepare-web.mjs`, `package.json`, 테스트와 `mobile/catalog.json`(빈 배열)을 다시 확인. 기존 `index.html` 지도 복사본만 패키징하는 구조 유지.
- 이전에 결과 미확인이던 [CI 43690640700](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43690640700)은 성공으로 종료됨. 이어 최신 모바일 회귀 [CI 43695380034](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43695380034) (`f679b53a895026faabc64714cf9fb011559cb58e`, 2026-11-15 08:37 UTC)도 `success`로 종료됨. 해당 실행의 `mobile-web` job에서 `Run mobile unit and UI contract tests`, `Verify source tree for packaging`, `Package static mobile web entry`, `Verify packaged LNT gate and map` 네 단계가 모두 `success`임을 GitHub Actions job API로 개별 확인. 이전의 '전체 npm test/패키징 미검증' 표기는 이 SHA에 대해서는 해소됨.
- 컨테이너의 직접 `git ls-remote`는 `Could not resolve host: github.com`으로 여전히 실패해 별도 로컬 재현/실제 모바일 브라우저·Android 실행은 불가. CI 성공은 테스트와 정적 패키징의 증거이지 모바일 웹 실기기 동작의 증거가 아님.
- 남은 합격 기준: 실제 관리기관/공식 출처로 확인된 산·섬·계곡·암벽·트레킹 최소 장소 데이터(현재 catalog.json 비어 있음), 전국 산 색인과 검증된 경로·거리·고도 연동, 모바일 브라우저에서 LNT 수락/거부/딥링크·지역/상세·지도 표시 검증, Android 패키징·실행. **MVP 미완료**. 원본 지도/UI·그래프·DEM·한계령 예외·35m 미승인 후보 및 별도 전국 데이터 정리 작업/스케줄 변경 없음.


## 2026-11-15 모바일 카탈로그 식별자 중복 방어

- 최신 main 및 `mobile/` 카탈로그·LNT 진입점·패키저·테스트 구조를 확인. 실제 출처 카탈로그 `mobile/catalog.json`은 여전히 빈 배열.
- `mobile/src/catalog.mjs`: 중복 장소 ID 판정을 NFC에서 NFKC로 강화. 전각 영숫자/하이픈 등 호환 동등 ID가 서로 다른 장소로 중복 게시되는 것을 방지. 원본 ID 표시는 그대로 유지하고 정상 레코드를 임의 병합하거나 삭제하지 않음.
- `mobile/tests/catalog-compatibility-ids.test.mjs`: 전각/ASCII 및 조합형/완성형 ID 중복 회귀 2건 추가. Node 22.16.0에서 동일 정규화 판정 독립 단언 3건 통과. 전체 저장소 테스트와 웹 패키징은 로컬 `github.com` DNS 실패로 직접 실행 불가; 새 테스트의 CI 통과 여부는 별도 확인 필요.
- 코드 커밋 `c8ead1422481bd18ae7bed62f3db1df430cb27fc`, 테스트 커밋 `29b157bbcbb5510c11e5aa6c4bc3e70a121ceb23`.
- 미완료: 실제 출처 검증 장소 데이터, 전국 산 색인/검증 경로·고도 연동, 모바일 브라우저/Android 실기기 실행. 다섯 카테고리/LNT 정책, 기존 지도·원본 그래프·DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 자동 작업은 불변. 기본 기능 완료로 판정하지 않음.


## 2026-11-15 모바일 개발 실행: 검색 호환 문자 정규화

- 최신 main 커밋 및 `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `package.json`, `tests/catalog.test.mjs`, `scripts/prepare-web.mjs`, `catalog.json`(빈 배열), `src/map-guard.mjs` 확인.
- 검색/지역 필터의 NFC 정규화를 NFKC로 변경해 전각 숫자·전각 공백이 원본 일반 문자와 동등하게 검색되도록 수정. 실제 장소를 생성하지 않으며 ID 중복 NFKC 정책과 일치시킴.
- `mobile/tests/catalog.test.mjs`에 전각 숫자/지역 공백 일치와 다른 숫자 불일치 회귀 사례 추가.
- 독립 JS 동등 정규화 단언 3/3 통과. GitHub 전체 `npm test`, 패키징, 브라우저/Android 실기기 실행은 이번 실행에서 미검증이며 새 커밋의 CI 성공도 아직 확인하지 않음.
- 코드 커밋 `26386017346fd9cd1fe2a41fa4dd8e183b74ecc5`, 테스트 커밋 `7330ea4096ac68b6aa747b04e27b2d1bb4cc5604`.
- 남은 완료 기준: 출처 확인된 실재 5종 장소 데이터와 지역별 탐색/상세, 전국 산 색인·경로/거리/고도 연동, LNT 및 지도 진입의 브라우저 실행, 전체 자동 회귀·웹 패키징 검증. Android 빌드/현장 통행 검증은 별도 한계로 기록. 기존 지도·원본 그래프/DEM·한계령 예외 및 전국 데이터 정리 자동 작업 불변.


## 2026-11-15 모바일 개발: 지역 선택 호환 문자 일치

- `main`의 `mobile/src/catalog.mjs`, 지역 옵션 테스트, `mobile/catalog.html`, LNT 진입점, 패키징 스크립트 및 빈 `mobile/catalog.json` 확인. 지역 검색은 NFKC 정규화하지만 드롭다운 옵션 생성은 하지 않아 전각 공백이 포함된 지역이 중복 또는 선택 불일치로 나타나는 결함 확인.
- `regionOptions`에 NFKC 정규화 적용. 실재 레코드의 지역 접두어만 생성하며 다섯 카테고리, 이용 허용 미확인 기본값, 기존 지도/그래프/DEM, 한계령 예외 및 35m 미승인 후보 정책 불변.
- `mobile/tests/region-options.test.mjs`에 전각 공백과 일반 공백의 옵션 중복 제거·지역 필터 일치 회귀 추가. 동일 옵션 생성식의 독립 JavaScript 검사 통과. **신규 테스트 파일 직접 실행, 전체 npm test, CI, 모바일 브라우저/Android 실행은 미검증**: 로컬 `git ls-remote`에서 `Could not resolve host: github.com` 발생.
- 코드 커밋 `2a09d993d208897d1a97caac12ae295e01bf1ad6`, 테스트 커밋 `3f160418637d203f350c05e989f7159bf9ef9eaa`.
- 남은 합격 기준: 전체 회귀/패키징 CI 확인, 출처 확인된 실재 5종 장소 데이터, 전국 산 색인·검증 경로/거리/고도 연동, LNT 및 지역/상세/지도 모바일 브라우저 검증, Android 실빌드. 전국 데이터 정리 자동 작업/스케줄 변경 없음. 기본 기능 미완료.

## 2026-11-15 모바일 계곡 미확인 근거 표시 정합성

- 최신 main의 모바일 카탈로그 모듈, 화면, LNT 진입점, 패키징 스크립트, 테스트 및 기존 상태 기록 확인. 루트 index.html은 API에서 큰 파일의 본문이 비어 반환되어 실제 내용 재검증 불가.
- 계곡 활동이 명시적으로 `unknown`인데 출처·확인일이 입력되면 이를 그대로 상세에 표시하던 결함 수정. 이제 `unknown` 또는 확정 상태의 근거가 불충분하면 상태·출처·확인일을 모두 미확인으로 정규화. 근거가 유효한 확정 상태는 유지.
- 변경 `d7649e13d836ca5646a59dfef0b7f6b6cd58959c`, 회귀 테스트 `58bbd9f35abf3ea1141de3c6029b0ed851b95bc9` (`mobile/tests/valley-unknown-evidence.test.mjs`, 2건).
- 동일 분기 조건의 독립 JavaScript 입력 검사 4건 통과. 전체 `npm test` 및 `prepare:web`은 컨테이너 `github.com` DNS 해석 실패로 checkout 불가하여 실행하지 못함. 신규 테스트의 GitHub Actions 결과, 모바일 브라우저·Android 실행도 미확인.
- 다음 합격 기준: 원격 CI에서 신규 회귀 포함 전체 테스트/패키징 통과, 실제 출처 장소 데이터와 전국 산 색인·검증 경로 연동, 다섯 카테고리·지역 검색·상세·LNT 게이트의 모바일 웹 동작 확인. MVP 미완료. 기존 지도 UI·원본 그래프/DEM·한계령 예외·35m 후보 승인 규칙과 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-15 모바일 지역 선택 카테고리 정합성

- `main`의 LNT 진입, 모바일 카탈로그/패키징, 지역 테스트와 기존 지도 접근 구조 확인. 카테고리 전환 후에도 다른 유형의 장소에서만 존재하는 지역이 드롭다운에 남는 문제 수정.
- `categoryRegionOptions` 추가, 카테고리 전환 및 카탈로그 재로딩 시 지역 선택지 재구성. 기존 선택 지역이 새 카테고리에 없으면 전국으로 복귀. 원본 지도/그래프/DEM, 한계령 예외, 35m 후보 연결 및 다섯 카테고리 불변.
- `region-options.test.mjs`에 유형별 지역 격리·빈 유형 회귀 추가. 독립 JS 입력 검사 및 UI 코드 구조 단언 통과. GitHub DNS 해석 실패로 전체 checkout/npm test/prepare:web 및 실제 모바일 브라우저·Android 검증은 미실행; CI 결과 미확인.
- 남은 완료 조건: 실재 출처 장소 데이터, 전국 산 색인·검증 경로/고도 연동, 전체 회귀/패키징 CI, 모바일 웹 LNT·지역·상세·지도 진입 동작 검증. 기본 기능 미완료. 별도 전국 데이터 정리 작업 불변.


## 2026-11-16 모바일 장소 ID 충돌 방지

- main `dcf9b6aa2709f02b3f846b3de99f788c6c895565`에서 모바일 진입/LNT, 카탈로그, 테스트, 패키징 구조 및 기존 지도 분리 확인.
- 카탈로그 중복 판별 시 NFKC 외에 대소문자 정규화를 적용해 `Mountain-A`와 `mountain-a`, 전각 표기를 별도 장소로 중복 등록하지 않도록 수정. 표시 ID 원문과 지도/DEM/그래프는 변경하지 않음.
- 독립 JavaScript 충돌 검증 통과(중복 2개 제외, 고유 2개 유지). `mobile/tests/catalog.test.mjs`에 회귀 케이스 추가. 제품 수정 `fb8f01d3617c1d18c9ce2c7767f976a2aedb0773`, 테스트 `84f37959887ce13b7c9975a80a209692a0dd4cf2`.
- 로컬 GitHub clone은 `Could not resolve host: github.com`으로 실패. GitHub 커넥터 읽기/쓰기 가능하나 전체 `npm test`, `check:web`, 브라우저/Android 실행은 이번 실행에서 미검증. 추가 회귀의 CI 결과도 미확인.
- **MVP 미완료:** 출처 검증된 실제 장소 데이터, 전국 산 색인/경로/고도 연동, 모바일 웹 실행·전체 회귀·Android 검증 필요. LNT 게이트 및 다섯 카테고리 유지. 비공식 35m 연결 후보, 한계령 사용자 승인 예외, 원본 그래프/DEM 및 별도 전국 데이터 정리 작업 불변.


## 2026-11-16 모바일 상세 정보 구분

- 최신 main의 모바일 카탈로그/진입점, 공통 정규화, 테스트 및 패키징 스크립트를 확인. 기존 산 지도/DEM/그래프 파일은 수정하지 않음.
- 비계곡 카테고리(산·섬·암벽·트레킹) 상세에서 계곡 전용 출입·물놀이·취사·야영 네 항목을 일괄 표시하던 오류를 수정. 계곡만 활동별 근거를 표시하고 나머지는 이용 허용 여부 미확인/관리기관 확인 필요로 표시.
- 변경 커밋: afff8aa28950bcab1f489f130aab2c9f2f590738; 정적 회귀 테스트 추가: 65a3e5cbd12b4f40a1aa1205e4419cb1bf7698ef.
- 변경된 HTML 문자열 조건과 분기 구조를 확인. **전체 저장소 npm test/웹 패키징/브라우저 실행 결과는 이번 실행에서 확보하지 못했으므로 통과로 간주하지 않음.** 신규 테스트의 CI 통과 확인 필요.
- 남은 완료 조건: 출처 검증된 실제 장소 데이터, 전국 산 색인/검증 경로·거리·고도 연동, LNT/검색/상세 모바일 웹 실행, 전체 회귀 테스트, Android 검증. 한계령 예외 및 35m 미승인 후보 정책, 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-16 모바일 자동 개발 실행 11

- 최신 `main` 커밋 `de72cf11959063016bc0f6f8035c8c939a8cebc1` 및 `mobile/package.json`, `mobile/src/catalog.mjs`, `mobile/catalog.html`, `mobile/entry.html`, `mobile/scripts/prepare-web.mjs`, `mobile/tests/catalog.test.mjs` 확인. `mobile/index.html`과 `mobile/app.js`는 존재하지 않으며 모바일 진입점은 `entry.html`임.
- 장소 ID의 NFKC·대소문자 정규화 후에도 연속 공백 차이로 동일 장소가 중복 등록될 수 있는 결함 수정. 공백 연속을 단일 공백으로 통일해 중복 거부하며 원래 표시 ID는 보존. 새 회귀 테스트 1건 추가.
- 독립 JS 정규화 단언 3건 통과. GitHub 커넥터를 통해 소스와 테스트를 커밋했으나 **전체 `cd mobile && npm test`, `npm run check:web`, 브라우저/Android 실기기 실행은 이 실행에서 검증하지 못함**. 새 회귀 테스트의 CI 결과도 미확인. 코드 커밋 `8d9aefcf3017ee6a988ff395eda9f129a25f540b`, 테스트 커밋 `a6804d24bea8562d227a00af1dc25d78387e0aa1`.
- 미완료: 출처 확인된 실제 장소 카탈로그, 전국 산 색인/검증 경로·고도 연결, LNT 및 다섯 카테고리의 실제 모바일 브라우저 회귀, Android 빌드. 기본 기능 완료 판정 금지. 기존 지도·DEM·그래프·한계령 예외·35m 비공식 연결 정책 및 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-16 모바일 자동 개발 실행 11

- 최신 `main`의 `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `scripts/prepare-web.mjs`, `tests/catalog.test.mjs`, `tests/valley-evidence.test.mjs`, `src/map-guard.mjs`와 최근 커밋 확인.
- 장소/활동 허가 출처로 `example.com`, `example.org`, `example.net`, `localhost` 등의 문서용 URL을 수용하던 결함을 수정. 이런 출처만 있으면 출시 카탈로그 행은 거부되고 계곡 허용 주장은 `unknown`으로 강등됨. 실제 관리기관 도메인 및 일반 기관 출처 표기는 유지.
- 로컬 Node.js 7건의 출처 판별 독립 검사를 통과. 회귀 테스트 파일 `mobile/tests/provenance-placeholder.test.mjs`에 출처, 출시 필터, 계곡 허용 상태 검사 3건 추가. **전체 `npm test`와 `prepare:web`, 브라우저/Android 검증은 이번 실행에서 수행하지 못했으므로 통합 통과로 판정하지 않음.**
- 기능 커밋 `6e302f0532eefbab5eb0163f0d5b2de755062b63`, 회귀 테스트 커밋 `70da83c8cc01e424b6ba7d5e910f1546e32c6e6a`.
- 기본 기능 **미완료**: 실재 출처가 확인된 5개 유형의 장소 데이터, 전국 산 색인·검증 경로/거리/고도 연동, 지역 검색·상세 및 LNT 게이트 브라우저 검증, 전체 자동 회귀/모바일 웹 실행 증거 필요. Android 실기기 패키징은 후속 검증.
- 기존 산 지도/원본 그래프·DEM, 한계령 승인 예외, 비공식 35m 후보 승인 정책 및 별도 전국 데이터 정리 작업은 변경하지 않음.


## 2026-11-16 모바일 회귀 테스트 정합성 수정

- 최신 main `34f78e412e956fa083bfd18a94440bf2154f32a0` 및 모바일 카탈로그·LNT 진입·웹 패키저·테스트·기존 지도 진입 구조 확인.
- `hasEvidenceSource`는 `example.org` 출처를 거부하지만 기존 `mobile/tests/catalog.test.mjs`는 이를 게시 가능한 레코드로 기대하는 불일치를 수정. 정상 출처 `source-c`만 게시, 미출처/예시 출처 행 0·1·3 제외를 단언.
- 독립 JavaScript에서 동일 예시 출처 판별의 수용 행 인덱스 `[2]` 확인. 전체 `npm test`, `npm run prepare:web`, 모바일 브라우저 및 Android 실기기 실행은 이 실행에서 미검증; 통합 통과 주장 금지.
- 테스트 변경 커밋 `5606411196341a02a3eab2922dd9e40ddfc02be2`. 출시 장소 카탈로그는 여전히 빈 배열; 실재 장소·전국 산 경로/고도 연동과 모바일 웹 실행 증거가 필요.
- 기존 지도 UI/그래프/DEM, 한계령 승인 예외, 비공식 35m 자동 연결 정책 및 별도 전국 데이터 정리 작업 불변. MVP 미완료.


## 2026-11-16 모바일 출처 URI 안전성 보강 (08:34 KST)

- main 최신 상태 및 mobile/src/catalog.mjs, catalog.html, entry.html, tests/catalog.test.mjs, scripts/prepare-web.mjs, package.json, catalog.json([]) 확인.
- 출처 필드의 javascript:, data:, file:, blob:, about: URI를 근거로 인정하지 않도록 차단. 장소 공개 목록 및 계곡 활동 허용 상태 모두 기존 hasEvidenceSource 검증을 사용하므로 미확인 기본값 유지. 다섯 카테고리 및 원본 지도/그래프/DEM 변경 없음.
- 변경된 실제 함수 본문을 독립 JavaScript로 실행한 9개 입력 검사 통과. 회귀 테스트 mobile/tests/catalog-source-scheme.test.mjs 3개 추가. 전체 npm test, prepare:web, 브라우저/Android 실행 및 신규 CI 성공은 아직 검증되지 않음. GitHub 커넥터를 통한 소스 수정은 성공했으나 로컬 저장소 체크아웃/전체 테스트 실행 증거는 확보하지 못함.
- 코드 커밋 b9f3f7b9da37f9143b23ff701bdb0165348a4a84, 테스트 커밋 fe2be8299866ab2735308e8dfb7bef792870d66d.
- 남은 합격 기준: 실제 출처 장소 최소 데이터, 전국 산 색인 및 검증 경로·거리·고도 연결, LNT 직접 진입/거부 모바일 브라우저 검증, 전체 자동 회귀·웹 패키징 성공, Android 패키징/실기기 검증. 기본 기능 미완료. 한계령 사용자 예외, 비공식 35m 후보 임의 연결 금지 및 별도 전국 데이터 정리 자동 작업/스케줄 불변.

## 2026-11-16 모바일 탐색 상세 미확인 표기

- `main` HEAD `73bc247eac07aaab6f6a34b9cf79485cfcc646c3`에서 모바일 탐색·진입·패키징·회귀 테스트·빈 출시 카탈로그 확인.
- 산·섬·암벽·트레킹 기본 상세의 이용 규정 미확인 문구에 누락된 `물놀이`를 명시. 계곡별 4개 활동의 근거 기반 상태 분기와 기존 산 지도 링크는 그대로 유지.
- 회귀 테스트 1건 추가, GitHub에서 읽은 정확한 HTML 및 테스트 변경에 대해 정적 불변식 9건 통과. 로컬 `git clone`은 `Could not resolve host: github.com`으로 실패하여 전체 `npm test`, `check:web`, `prepare:web`, 브라우저 및 Android 실행은 미검증.
- 남은 합격 기준: 실제 출처의 다섯 카테고리 장소 데이터, 전국 산 색인·검증 경로/거리/고도 연동, LNT/검색/상세/지도 브라우저 통합 실행, 전체 자동 회귀·모바일 웹 검증. MVP 미완료.
- 원본 지도/그래프/DEM, 한계령 예외, 35m 후보 및 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-16 모바일 출처 URI 스킴 안전성 개선

- 최신 main, `mobile/src/catalog.mjs`, 탐색/LNT 진입 화면, 패키저, 테스트와 모바일 CI 설정을 확인.
- `hasEvidenceSource`가 `ftp:`, `vbscript:`, `chrome:`, 사용자 정의 스킴을 출처로 인정할 수 있던 결함 수정. URI 스킴이 명시되면 HTTP(S)만 허용하며 관리기관의 일반 문서명은 유지. 이 규칙은 장소 공개 및 계곡 활동 허용 근거에 함께 적용됨.
- 변경된 실제 함수 본문을 독립 JavaScript로 실행해 정상/차단 사례 8건 통과. `mobile/tests/catalog-source-schemes.test.mjs` 회귀 테스트 3건 추가. 전체 `npm test`, `check:web`, `prepare:web`, 브라우저/Android 실행은 **이번 실행에서 확인하지 못함**. CI 성공으로 간주하지 않음.
- 코드 커밋 `8ed7663b3a1094e19f36b6d2d9d74ce0b4d0a992`, 테스트 커밋 `a9f200de996802d126871b35c3bcd0f2fe4b18f9`.
- 남은 합격 기준: 실제 출처 장소 데이터, 다섯 카테고리/지역 검색/상세 브라우저 검증, 전국 산 색인과 검증 경로·거리·고도 연동, 전체 자동 회귀 및 모바일 웹 실행, Android 패키징 확인. 원본 지도·그래프/DEM·한계령 예외·35m 후보 승인 정책과 별도 전국 데이터 정리 자동 작업은 변경하지 않음.

## 2026-11-16 동의 후 산 지도 진입 수정 (12:37 KST)

- 모바일 카탈로그의 기존 `<a href="./map.html">`는 최상위 iframe 내부에서 지도로 이동해 패키징된 지도 LNT 가드가 기대하는 부모 `#app` 구조와 불일치할 수 있어, 동의한 부모의 `#app` iframe 주소를 `./map.html`로 변경하는 버튼으로 교체. 직접 지도 URL의 게이트 차단은 유지.
- `mobile/tests/map-navigation.test.mjs`에 프레임 전환 및 직접 진입 방어의 정적 회귀 2건 추가. Node v22.16.0 독립 프레임 전환/가드 모의 검사 3/3 통과. **실제 신규 테스트/전체 npm test, prepare:web, 브라우저 실행은 미검증**: 로컬 git ls-remote가 `Could not resolve host: github.com`으로 실패.
- 변경 커밋: `ec119b31125b5f149bb467b671003f475f71d576`, 테스트 커밋: `8d7cb0e8acf742508ece8fcdc136bcd177f17230`.
- 남은 합격 조건: 실제 출처 확인된 장소 데이터(현재 catalog.json 빈 배열), 전국 산 색인·검증 경로/거리/고도 연동, LNT·다섯 카테고리·지역검색·상세·산 지도 브라우저 통합 실행, 전체 자동 회귀 및 모바일 웹 실행, Android 패키징 확인. 원본 지도/그래프/DEM, 한계령 예외, 미승인 35m 후보, 별도 전국 데이터 정리 작업·스케줄 불변.


## 2026-11-16 자동 개발 실행 11

- `mobile/catalog.html`: 산·섬·암벽·트레킹 상세에서 묶음 안내 대신 출입·물놀이·취사·야영 각각 `미확인 (관리기관 확인 필요)`를 표시. 계곡의 활동별 근거/확인일 처리와 다섯 카테고리, 기존 산 지도/DEM/경로는 변경하지 않음.
- `mobile/tests/catalog-ui.test.mjs`: 비계곡 상세의 4개 활동 반복 렌더링과 기존 묶음 문구 제거를 확인하는 정적 회귀 단언 갱신.
- 원본 문자열 일치, 변경 후 구조 불변식 검사 통과. 전체 `npm test`, `check:web`, `prepare:web`, 실제 브라우저/Android 실행은 이 실행에서 수행하지 못했으므로 **통합 검증 미완료**. 추가된 회귀 테스트도 실행 통과로 간주하지 않음.
- 코드 커밋 `efff58c5b7ec916a47b0198193c58af854eb3599`, 테스트 커밋 `cd0a9d345c96ecdfc47496a40888e395cbd304de`.
- 남은 합격 기준: 출처 확인된 4개 비산 카테고리 실제 데이터, 전국 산 데이터 색인·검증된 거리/고도 연동, 모바일 웹에서 LNT/탐색/상세/지도 진입 실행 검증 및 전체 회귀 테스트. 기본 기능 미완료.


## 2026-11-16 모바일 출처 URL 형식 검증

- main의 모바일 카탈로그 모듈·UI·LNT 진입점·패키징 스크립트·테스트와 최근 커밋을 확인. `mobile/src/catalog.mjs`에서 호스트 없는 HTTP(S) 출처(`https://`, `https://?q=x`)와 URL 사용자 인증정보(`https://user:pass@...`)를 근거로 인정하지 않도록 수정. 관리기관 문서명 및 정상 HTTPS 출처는 유지. 허위 장소 추가 없음.
- 수정 함수의 독립 실행 7개 입력 검증 통과. `mobile/tests/source-url-shape.test.mjs`에 출시 카탈로그 제외·계곡 허용 상태 `unknown` 강등 회귀 테스트 추가. 코드 커밋 `561323403a5faba0b44c1b8ecbce70386c53cb56`, 테스트 커밋 `863f0cd9219512167f4a77592fcd4f19fc6fba2e`.
- **전체 `npm test`, `check:web`, `prepare:web`, 브라우저/Android 실행 미검증**: 로컬 Git 원격 접근이 `Could not resolve host: github.com`으로 실패. 독립 함수 검사만 통과했으며 신규 테스트의 실제 CI 결과는 미확인.
- 남은 합격 기준: 출처 확인된 실재 장소 데이터, 전국 산 색인·검증 경로/거리/고도 연동, LNT 및 다섯 카테고리의 모바일 웹 브라우저 실행, 전체 회귀/패키징과 Android 확인. 기존 지도/원본 그래프/DEM/한계령 예외/비공식 35m 정책과 별도 전국 데이터 정리 자동 작업 불변. MVP 미완료.


## 2026-11-16 모바일 출처 URL 공백 방어

- 최신 main과 `mobile/src/catalog.mjs`, `catalog.html`, `entry.html`, `catalog.json`, `scripts/prepare-web.mjs`, 기존 테스트·원본 `index.html` 존재를 확인.
- HTTP(S) URL의 호스트 뒤 경로에 문자 그대로 공백이 있어도 장소/계곡 활동 출처로 인정되던 문제 수정. 인코딩된 `%20` 및 일반 관리기관 문서명은 유지. 코드 `9171c7459e96a5034be25b80069e7906256b7a66`, 회귀 테스트 `a2f30491fcc5c0b6cb68f4d81043a12e9cacb0ba`.
- Node 독립 URL 검증 6/6 통과. 신규 테스트는 저장소에 추가했으나 전체 `npm test`, `check:web`, `prepare:web`, 브라우저·Android 실행 성공은 이번 실행에서 확인하지 못했으므로 MVP 완료 아님.
- 출시 카탈로그는 여전히 `[]`. 실제 출처 장소 데이터, 지역 검색/상세 통합 검증, 전국 산 경로·거리·고도 연동, 모바일 웹/Android 패키징 검증 필요.
- 원본 지도 UI/그래프/DEM, 한계령 승인 예외, 35m 미승인 연결 후보 및 별도 전국 데이터 정리 자동 작업 불변.


## 2026-11-17 모바일 자동 개발 실행 — 환경 장애 기록

- GitHub `main` 최신 커밋 `5dbbc685e98b2675c028b1026cd22792b096ed36`(v301 전국 데이터 감사)을 GitHub 커넥터로 확인. `mobile/` 디렉터리, `mobile/package.json`, `mobile/src/catalog.mjs`, `mobile/src/lnt-gate.mjs`, `mobile/entry.html`, `mobile/catalog.html`, `mobile/scripts/prepare-web.mjs`, 기존 회귀 테스트 목록 및 지도 패키징 구조 확인.
- 로컬 Node.js `v22.16.0` 확인. `git ls-remote https://github.com/suminma27-ship-it/sanbakmap.git HEAD` 실행 실패: `Could not resolve host: github.com`. 따라서 저장소 전체 체크아웃, `npm test`, `npm run check:web`, `npm run prepare:web`, 모바일 브라우저 실행은 수행하지 못함. GitHub Actions 목록 조회도 GitHub 연결 도구 URL 허용 제한(HTTP 400)으로 실패.
- 이번 실행의 코드 변경 없음. 실제 장소 카탈로그 `mobile/catalog.json`은 3바이트의 빈 JSON 배열 상태. 원본 지도/DEM/그래프, 한계령 사용자 확인 예외, 미승인 35m 후보, 별도 전국 데이터 정리 자동 작업 및 스케줄은 수정하지 않음.
- **MVP 미완료:** 출처 검증된 산·섬·계곡·암벽·트레킹 실제 목록 및 지역 검색·상세, LNT 게이트 브라우저 동작, 기존 산 지도 진입과 검증 경로·거리·고도 통합, 전체 자동 회귀/모바일 웹 실행, Android 패키징 검증이 필요. 환경 복구 후 전체 테스트·웹 패키징부터 재개.


## 2026-11-17 모바일 CI 실패 원인 수정 및 전체 자동 회귀 검증 (01:40 KST)

- GitHub Actions `Mobile MVP regression`의 실제 실패 로그를 확인: 이전 실행 `43817677144`에서 119건 중 109건 통과·10건 실패. 주요 원인은 출처 URL 호스트 검사 정규식의 `\\s` 오기(정상 `knps.or.kr`·`forest.go.kr` 출처 오차단)와 기존 상세 UI 개편 이후 미갱신 정적 테스트 2건.
- `mobile/src/catalog.mjs` 정규식을 `\\s` 공백 클래스에 맞게 수정해 정상 HTTPS 관리기관 도메인을 인정하면서 호스트 누락·인증정보·공백 포함 URL은 계속 차단. `mobile/tests/all-category-permission-ui.test.mjs`, `mobile/tests/category-detail.test.mjs`를 실제 네 활동별 미확인 표시 구조와 동기화.
- 코드/테스트 커밋: `f7fb6f2f975fbf03c12652ba0eae96232f8fe3ba`, `17d6c4b0353339a6899440c84223844e49703e51`, `46550a109647ebe8a7120abdb63de76ed9165d18`.
- **GitHub Actions 실행 `43910100419` 성공**: Node 회귀 **119/119 통과**, `check:web`, `prepare:web`, 패키징된 LNT 진입·카탈로그·지도 검사 전부 성공. 실행 증거: https://github.com/suminma27-ship-it/sanbakmap/actions/runs/43910100419
- 로컬 컨테이너에서는 여전히 `git ls-remote`가 `Could not resolve host: github.com`으로 실패하지만, 이번에는 GitHub Actions 원격 전체 테스트/웹 패키징 성공을 직접 확인함. **실제 브라우저 화면 동작과 Android APK 실빌드는 아직 미검증**.
- 남은 MVP 합격 기준: 실제 출처가 있는 섬·계곡·암벽·트레킹 장소 데이터 및 산 색인 등록, 다섯 카테고리·지역·상세 브라우저 검증, 기존 산 지도에서 검증된 경로·거리·고도 연동, 모바일 웹 실제 실행 확인. 원본 지도/DEM/그래프, 한계령 예외, 미승인 35m 후보, 별도 전국 데이터 정리 작업·스케줄은 변경하지 않음. 자동 개발 계속.


## 2026-11-17 모바일 전국 지역 선택 개선 (02:38 KST)

- 최신 모바일 LNT 진입점, 다섯 카테고리 카탈로그/상세, 패키징 스크립트, 테스트 및 기존 지도 경로를 GitHub 커넥터로 확인. 로컬 Git 원격 접근은 여전히 `Could not resolve host: github.com` 오류.
- `mobile/src/regions.mjs` 추가: 실제 장소 목록이 비어 있어도 17개 광역 행정구역을 지역 선택에서 제공. 세부 시·군·구는 해당 카테고리의 실제 레코드에서만 추출하며, 장소 자체를 생성하지 않음.
- `mobile/catalog.html` 지역 선택을 전국 지역 함수로 연결. `mobile/tests/regions.test.mjs` 3개 회귀 케이스 추가(빈 카탈로그 17지역, 카테고리별 하위지역 분리, 공백/호환문자 정규화). Node.js 22.16.0 로컬 동일 모듈·테스트 독립 실행 **3/3 통과**.
- 커밋: 지역 모듈 `f279a43342e9bb410fba6f07d8103954a62b2555`, 테스트 `31d04d16ef9ede5b90e1ba79b668674e1d5f9bee`, 카탈로그 UI 연결 `c33abe21300ec70df715747fa054b738840065de`.
- 이번 변경의 전체 저장소 `npm test`/`check:web`/`prepare:web`, 브라우저/Android 실행은 **미검증**. 직전 GitHub Actions 119/119 통과는 이번 신규 커밋의 CI 결과가 아님.
- 남은 합격 기준: 출처 확인된 5개 카테고리 실제 장소·상세 데이터, 전국 산 색인 및 검증된 경로/거리/고도 통합, LNT/지역검색/목록/상세/지도 진입의 모바일 브라우저 실동작, 전체 회귀·패키징 및 Android 확인. 원본 지도/그래프/DEM, 한계령 승인 예외, 미승인 35m 후보 및 별도 전국 데이터 정리 작업 불변. **MVP 미완료**.


## 2026-11-17 전국 지역 선택 유효성 보강

- `mobile/src/regions.mjs`에서 출처 레코드의 잘못된 광역 행정구역 명칭이 전국 지역 선택지에 추가되는 문제를 차단. 17개 시·도는 고정 유지하고 그 하위 지역은 실제 레코드 및 유효한 시·도 접두어가 있을 때만 노출. 장소/허가 정보를 생성하지 않음.
- `mobile/tests/regions.test.mjs`에 잘못된 광역 지역 차단 회귀 테스트 추가. Node 독립 실행에서 기존 3개와 신규 1개, 총 4/4 통과. 전체 저장소 `npm test`·GitHub Actions 및 모바일 브라우저 실동작은 이 실행에서 미확인으로 남김.
- 코드 커밋 `2c3f2f7ee93b52f17c3d4eec30b143a9adab0f6b`, 테스트 커밋 `0752a874dd1e2b9ae2a317070568c6e2b91fd029`.
- 남은 완료 조건: 출처 확인된 실재 장소 데이터, 다섯 카테고리 지역/상세 통합 검증, 전국 산 경로·거리·고도 연동, LNT 모바일 브라우저 검증, 전체 CI·웹 실행 및 Android 빌드 확인.
- 기존 지도 UI·원본 그래프/DEM·한계령 사용자 예외·35m 미승인 후보 연결 정책 및 별도 전국 데이터 정리 작업/스케줄은 변경하지 않음.


## 2026-11-17 모바일 개발: 카테고리별 빈 데이터 안내 구분

- 최신 모바일 카탈로그·LNT 진입점·지역 필터·웹 패키저와 기존 지도 원본 구조를 확인. 출시 카탈로그 `mobile/catalog.json`은 여전히 빈 배열이며 장소를 임의 생성하지 않음.
- `mobile/src/empty-state.mjs`와 `mobile/tests/empty-state.test.mjs` 추가. 선택한 카테고리에 검증된 자료가 없는 경우와, 등록 자료가 있지만 검색/지역 조건에 맞지 않는 경우를 구분하고 로딩 실패를 우선 안내.
- `mobile/catalog.html`에 순수 안내 함수 연결. 기존 다섯 카테고리, 17개 시·도 선택, LNT 동의, 원본 지도·DEM·그래프, 한계령 예외, 35m 연결 정책 변경 없음.
- 로컬 Node.js `node --test empty-state.test.mjs` 3/3 통과. 전체 저장소 `npm test`, 모바일 웹 패키징 및 브라우저/Android 실행은 이번 변경 기준 미검증. GitHub Actions 결과 확인 전 완료로 판정하지 않음.
- 코드 커밋: `86c6926`, 테스트 커밋: `55a176f`, 화면 연결 커밋: `704582f`.
- 남은 합격 기준: 실제 출처가 있는 계곡·섬·암벽·트레킹 장소, 전국 산 지도 경로·거리·고도 연동, LNT 우회 방지 브라우저 검증, 전체 회귀 테스트·웹 패키징·Android 실행 검증. 별도 전국 데이터 정리 자동 작업 유지.


## 2026-11-17 모바일 장소 출처 링크

- `mobile/catalog.html` 기본 상세에서 출처가 HTTPS URL일 때만 `장소 출처 확인` 링크를 표시하고 새 탭 링크에 `noopener noreferrer`를 적용. 비 URL 출처는 기존 텍스트 유지. 실제 장소나 이용 허가 데이터는 추가하지 않음.
- `mobile/tests/catalog-ui.test.mjs`에 출처 링크 계약 회귀 테스트 추가. 수정 원문 정적 단언 6/6 통과. **전체 `npm test`, 웹 패키징, 브라우저/Android 실행은 이번 실행에서 미검증**이므로 MVP 완료 아님.
- 남은 기준: 실재 출처의 5개 카테고리 데이터, 지역 검색·상세 및 LNT 브라우저 검증, 전국 산 지도/경로/거리/고도 연동, 전체 자동 회귀와 모바일 웹 실행, Android 검증.
- 원본 지도 UI·그래프·DEM·한계령 예외·35m 후보 및 별도 전국 데이터 정리 작업/스케줄 불변.


## 2026-11-17 모바일 개발 실행 — 출처 URL 형식 검증

- `main` 최신 이력과 `mobile/src/catalog.mjs`, `mobile/catalog.html`, `mobile/entry.html`, `mobile/catalog.json`, `mobile/package.json`, 기존 테스트 및 루트 `index.html` 존재를 확인. 실제 출시 카탈로그는 `[]` 유지.
- 출처 문자열의 `https://.` 같은 비정상 호스트 및 `https://foo`처럼 도메인 점이 없는 URL을 `URL` 파서와 호스트·계정 검증으로 거부. 공식 기관 HTTPS 주소는 유지. 출처 내용의 진위/이용 허가를 자동 보증하는 기능은 아님.
- `mobile/tests/catalog.test.mjs`에 악성·잘못된 URL 4개 거부, 관리기관 URL 2개 수용 회귀 사례 추가.
- Node.js v22.16.0 독립 검증 스크립트에서 URL 형식 8개 검사 통과. 로컬 `git ls-remote`는 `Could not resolve host: github.com`으로 실패해 전체 저장소 `npm test`, `check:web`, `prepare:web`, 브라우저/Android 검증은 이번 변경 기준 미실행. GitHub Actions 통과도 아직 확인되지 않음.
- 코드 커밋 `794b2b905d9bb0bb49b8a509e5ba4c7f748cd78b`, 정규식 수정 `05bde62583bfefde754cd4dc890f2371d12f00b1`, 회귀 테스트 `b47ee535e6775be3dfec62678b18644c3daff78b`.
- 남은 완료 게이트: 출처 확인된 4개 비산 카테고리 최소 장소, 5개 카테고리 실제 목록·상세/지역검색, LNT 수락·거부와 딥링크, 기존 산 지도/거리/고도 통합, 전체 회귀·모바일 웹 브라우저 실행 및 Android 패키징. 원본 지도·그래프·DEM, 한계령 예외, 35m 후보 미승인 정책 및 별도 전국 데이터 정리 자동 작업 불변.

## 2026-11-17 모바일 지도 → 장소 목록 복귀 기능 (19:36 KST)

- GitHub main의 `mobile/entry.html`, `catalog.html`, `src/catalog.mjs`, `src/map-guard.mjs`, `scripts/prepare-web.mjs`, 테스트, 빈 `catalog.json`을 확인. `map.html`은 소스 파일이 아니라 패키징 시 생성되는 LNT 보호 지도 복사본임.
- 모바일 카탈로그에서 기존 산 지도로 진입한 뒤 목록으로 돌아오는 앱 내 조작이 없던 문제를 해결. 패키징 지도에만 접근성 이름이 있는 '← 장소 목록' 버튼을 삽입하고, 동의된 부모 iframe의 `catalog.html`로 복귀하도록 구성. 원본 `index.html`·지도 UI 소스·원본 그래프/DEM·한계령 예외·35m 연결 정책은 변경하지 않음.
- 내장 스크립트 JavaScript 구문, head 삽입, head 누락 거부를 독립 실행 검사로 확인. `mobile/tests/map-return.test.mjs`에 LNT 우회 방어·복귀 연결·중복 삽입 방지 회귀 추가. **저장소 전체 `npm test`, 웹 패키징, 브라우저/Android 실제 실행은 이번 실행에서 확인하지 못함.** 독립 검사를 전체 통과로 해석하지 않음.
- 기능 커밋 `24a1b9819ff41c2642f966d0049bd96a83e3ed44`, 회귀 테스트 커밋 `18196f871defa11061d4352e74139ea2a038e100`.
- 남은 합격 조건: 출처가 실제로 확인된 장소 데이터(현재 카탈로그 빈 배열), 전국 산 색인 및 검증된 경로·거리·고도 연동, 5개 카테고리 실데이터 지역/상세, LNT 브라우저·모바일 웹 통합 실행, 전체 CI 회귀/패키징, Android 빌드. MVP 미완료. 별도 전국 데이터 정리 자동 작업은 변경하지 않음.

## 2026-11-17 모바일 코스 저장 엔진 1단계 (20:36 KST)
- `mobile/src/plan-storage.mjs`: 산코드·자료유형·원본 그래프 지문·경유지 순서·계획일·안전 미확인 표기를 담은 버전 1 로컬 저장/조회/삭제/복원 검증 모듈 추가. LNT 동의는 저장하지 않음.
- 원본 그래프 내용이 달라지거나 노드가 유효하지 않거나 현재 모델에서 경로가 끊기면 복원을 거부하며, 원본 경로의 현행 통행 허가를 주장하지 않음.
- `mobile/tests/plan-storage.test.mjs`: 저장·조회·삭제, 그래프 변경·경로 단절 거부, 허위 허가·날짜·노드 형식 거부 회귀 3건 추가.
- Node 22 로컬에서 동일 모듈의 독립 테스트 **3/3 통과**. GitHub 코드 커밋 `3285426`, 테스트 커밋 `834e819`. 저장 UI와 기존 `nationwide-plan.html` 연결은 아직 미구현.
- 전체 `npm test`·`check:web`·`prepare:web`, 브라우저/Android 실행 및 신규 커밋 CI는 이번 실행에서 확인하지 못함. 완성 판정 금지.
- 다음: 실제 계획 화면에 저장·불러오기·삭제·날짜 선택 UI 연결 및 원본 변경/미연결 복원 통합 테스트. 기존 지도/DEM·한계령 예외·35m 후보 정책 및 별도 전국 데이터 정리 작업 불변.


## 2026-11-17 코스 관리 화면 연동
- `mobile/catalog.html`에서 저장 코스 관리 화면으로 진입하는 버튼 연결.
- `mobile/plans.html` 신규: 로컬 저장 코스 목록·삭제, JSON 내보내기·가져오기와 실패 메시지 구현.
- 직접 진입은 기존 LNT 부모 iframe 확인으로 차단; 영구 동의 저장하지 않음.
- `prepare-web.mjs`에서 plans.html 패키징, `plans-ui.test.mjs` 정적 회귀 추가.
- GitHub 커밋 `97b6ec5`, `335deda`, `90cbdc9`, `faba27f` 반영; 전체 CI/브라우저/Android 실기기 실행 결과는 아직 미확인.
- 남은 조건: 실제 지도 경유지 저장·복원 연동 및 그래프 재검증, LNT 직접접근 실동작, 모바일 웹/Android 실행, 다섯 카테고리 실제 장소 검증.
