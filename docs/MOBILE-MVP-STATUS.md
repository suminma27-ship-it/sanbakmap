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
