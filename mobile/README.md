# 산박지도 모바일 앱 — 1단계

기존 산박지도 웹 화면과 경로/DEM 원본을 변경하지 않고 Capacitor를 이용해 Android·iOS 앱 패키징을 시작한다.

## 실행

Node.js 20+, npm, Android Studio(Android) 또는 macOS/Xcode(iOS)가 필요하다.

```sh
cd mobile
npm install
npm run check:web
npm run prepare:web
npx cap add android
npx cap sync android
npx cap open android
```

iOS: `npx cap add ios && npx cap sync ios && npx cap open ios` (macOS/Xcode 필요).

웹 소스 갱신 후: `npm run prepare:web` 및 `npx cap sync android` 또는 `npx cap sync ios`. `www/`, `android/`, `ios/`는 초기 단계 로컬 생성 산출물이며 아직 저장소에 커밋하지 않는다.

## 보존 및 제한

- 복사 대상은 루트의 정적 웹 자산 및 `core/`, `data/`뿐이다. 기존 `index.html`, 원본 그래프/DEM, 지도 UI, LNT 동의 흐름, 한계령 사용자 예외는 수정하지 않는다.
- 35m 임시 연결은 공식 통행 근거 없이는 실제 등산로로 승인하지 않는다. 검증 전 라우팅 활성화 금지.
- 외부 지도 타일 및 온라인 자료는 연결이 필요하다. 오프라인 사용·네이티브 화면·사용자 동의는 실기기에서 별도 검증한다.
- `kr.sanbakmap.app` 식별자는 개발용 초안이다. 출시 전 앱 ID/서명/스토어 소유권 확정 필요.
- APK/IPA 빌드, Android/iOS 실기기 검증 및 스토어 배포는 아직 수행하지 않았다.

## 다음 합격 기준

1. Android/iOS 프로젝트 생성·빌드 및 실기기 최초 실행 확인
2. 기존 LNT 동의, 지역 검색, 산 지도, 경유지 변경, 거리·고도그래프 회귀검증
3. 검증되지 않은 연결이 자동 길찾기에 포함되지 않는지 확인
4. 웹/모바일 버전 동기화, 캐시·외부 서비스 동작 확인

전국 데이터 정리용 기존 자동 작업은 별도로 유지한다.
