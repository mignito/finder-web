# FINDER — 웹 스펙 문서

> 원본: finder-app (React Native / Expo)에서 이식
> 현재: finder-web (React / Vite / Kakao Maps)

---

## 서비스 개요

**FINDER**는 위치 기반 반려동물 실종 탐색 커뮤니티 웹앱이다.

- 실종 신고자: 지도에서 위치를 찍고 사진·현상금 포함 신고 등록
- 목격자: 신고 카드를 보고 목격 제보(텍스트·사진·위치) 등록
- 모든 사용자: 지도에서 주변 실종 마커 확인

---

## 색상 & 디자인 시스템

| 변수 | 값 | 용도 |
|------|----|------|
| `--primary` | #FF6B35 | 브랜드 주황 |
| `--primary-light` | #FFF5F0 | 연한 배경 |
| `--primary-border` | #FFD5C2 | 연한 테두리 |
| `--text-sub` | #666 | 보조 텍스트 |
| `--text-muted` | #999 | 흐린 텍스트 |
| `--border` | #eee | 구분선 |

- 아이콘: 이모지 기반 (🐾 📍 📷 🗺 🔴 👤)
- 레이아웃: 모바일 first, max-width 430px

---

## 라우팅 구조

```
/           → MapPage    (지도 메인)
/report     → ReportPage (실종 신고 등록)
/detail/:id → DetailPage (실종 상세 + 목격 쓰레드)
*           → / 리다이렉트
```

미인증 시: AuthPage 표시 (라우팅 전환 없음, 세션 기반 조건부 렌더)

---

## 데이터 모델 (Supabase)

### reports 테이블

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | uuid | ✓ | PK |
| pet_name | text | ✓ | 반려동물 이름 |
| pet_type | text | ✓ | 강아지 / 고양이 / 기타 |
| pet_breed | text | | 품종 |
| pet_age | integer | | 나이 (세) |
| description | text | | 특징 설명 |
| reward | integer | | 현상금 (원) |
| last_seen_address | text | | 마지막 목격 주소 |
| last_seen_lat | float8 | ✓ | 위도 |
| last_seen_lng | float8 | ✓ | 경도 |
| photo_url | text | | 반려동물 사진 URL |
| status | text | | active / found |
| created_at | timestamptz | | 등록 시각 |

### sightings 테이블

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | uuid | ✓ | PK |
| report_id | uuid | ✓ | reports FK |
| description | text | ✓ | 목격 내용 |
| sighting_lat | float8 | | 목격 위도 |
| sighting_lng | float8 | | 목격 경도 |
| photo_url | text | | 목격 사진 URL |
| created_at | timestamptz | | 제보 시각 |

### Storage — photos 버킷

- `reports/{timestamp}.{ext}` — 실종 신고 사진
- `sightings/{timestamp}.{ext}` — 목격 제보 사진
- 공개 접근 허용

---

## Supabase 연결 정보

```
URL: https://lvxhevbskoyludpxgkzv.supabase.co
Region: Seoul
```

---

## 화면별 기능 명세

### AuthPage — 인증

**상태**: login | signup 모드 토글

**기능**:
- 이메일 + 비밀번호 입력
- 비밀번호 6자 이상 검증
- 로그인: `supabase.auth.signInWithPassword()`
- 회원가입: `supabase.auth.signUp()`
- 에러 메시지 인라인 표시
- 로딩 중 버튼 비활성화

**UI**:
- 로고: 🐾 + "FINDER" (대문자, 자간 넓게)
- 부제목: "반려동물 실종 탐색 커뮤니티"
- 카드형 폼 (흰색 배경, 둥근 모서리)

---

### MapPage — 지도 메인

**기능**:
- Kakao Maps 로드 (CDN: `window.kakao`)
- 앱 시작 시 현재 위치로 지도 이동 (geolocation)
- 기본 위치: 서울 (37.5665, 126.9780), level 7
- `reports` 테이블에서 `status = 'active'` 목록 fetch
- 각 report마다 마커 표시
- 마커 클릭 → InfoWindow 팝업
  - 72시간 이내 등록: "🔴 긴급" 뱃지
  - 이름 + 품종 표시
  - 현상금 표시
  - "▶ 상세보기" 클릭 → `/detail/:id` 이동
- 하단 배지: "🔴 주변 실종 N건"

**헤더**: 🐾 FINDER 로고 (absolute, 지도 위에 고정)

---

### ReportPage — 실종 신고 등록

**입력 필드**:

| 필드 | 타입 | 필수 |
|------|------|------|
| 사진 | 파일 업로드 (image/*) | |
| 동물 종류 | 토글 버튼 (강아지 / 고양이 / 기타) | ✓ |
| 이름 | text input | ✓ |
| 품종 | text input | |
| 나이 | number input | |
| 특징 설명 | textarea | |
| 현상금 | number input (원) | |
| 마지막 목격 위치 | 지도 모달에서 선택 | ✓ |

**위치 선택 모달**:
- Kakao Maps 렌더링 (level 4)
- "현재 위치로" 버튼
- 지도 클릭 → 마커 이동
- "이 위치로 확정 ✓" 버튼
- 확정 시: Kakao Geocoder로 주소 변환 (coord2Address)

**제출 (handleSubmit)**:
1. 필수값 검증 (petName, coords)
2. 사진 있으면 `photos/reports/` 에 업로드
3. `reports` insert
4. 성공 시 `/` 이동

**사진 업로드 방식 (웹)**:
- HTML file input으로 File 객체 획득
- `supabase.storage.from('photos').upload(path, file, { contentType })`
- 공개 URL 반환

---

### DetailPage — 실종 상세 + 목격 쓰레드

**상단 정보 카드**:
- 반려동물 사진 (있을 경우)
- 긴급 뱃지: 72시간 이내면 "🔴 긴급"
- 이름 + 종류 + 품종 + 나이
- 현상금 (오른쪽 상단)
- 특징 설명
- 마지막 목격 주소

**목격 제보 목록**:
- `sightings` 테이블 fetch (`report_id` 필터, `created_at` 오름차순)
- 각 제보: 아바타(👤) + "익명 제보자" + 상대 시간 + 위치 첨부됨
- 제보 내용 + 사진 (있을 경우)

**시간 포맷**:
```
< 1분  → "방금 전"
< 60분 → "N분 전"
< 24h  → "N시간 전"
그 외  → "N일 전"
```

**하단 입력창** (fixed, 하단 탭바 위):
- 📷 버튼: 사진 첨부 (선택됨 시 강조)
- 📍 버튼: 위치 선택 지도 모달 (선택됨 시 강조)
- 텍스트 입력
- "제보" 버튼

**목격 위치 선택 모달**:
- 지도에 실종 위치 회색 마커 표시
- 클릭으로 목격 위치 선택 (주황 마커)
- "이 위치로 확정 ✓"

**제출 (handleSubmit)**:
1. 텍스트 필수 검증
2. 위치: selectedCoords → 없으면 현재 위치 → 없으면 report 원래 위치
3. 사진 있으면 `photos/sightings/` 업로드
4. `sightings` insert
5. 성공 후 입력 초기화 + sightings 재fetch

---

## 개발 현황

### ✅ Phase 1 완료 (MVP)

- [x] 이메일/비밀번호 인증 (로그인·회원가입)
- [x] 지도에 실종 마커 표시 (Kakao Maps)
- [x] 마커 클릭 → 긴급 뱃지 + 현상금 InfoWindow
- [x] 실종 신고 등록 (사진·동물정보·현상금·위치)
- [x] 목격 제보 쓰레드 (텍스트·사진·위치 선택)
- [x] Supabase Storage 사진 업로드
- [x] 하단 탭 네비게이션 (지도 / 실종신고 / 로그아웃)

### ⬜ Phase 2 예정

- [ ] 푸시 알림 (내 신고에 제보 왔을 때)
- [ ] 내 신고 관리 페이지 (등록한 신고 목록, 상태 변경: active → found)
- [ ] 찾았어요 완료 처리
- [ ] 현상금 지급 시스템
- [ ] 등급·뱃지 시스템 (제보 수 기반)
- [ ] 전체 디자인 폴리싱

---

## 기술 스택 (웹)

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite |
| 라우팅 | React Router v7 |
| 백엔드·인증·스토리지 | Supabase JS v2 |
| 지도 | Kakao Maps JavaScript API (CDN) |
| 스타일 | CSS Variables + 인라인 스타일 |
| 배포 | (미정) |

---

## 앱 → 웹 기술 대응 표

| 앱 (React Native) | 웹 (React) |
|-------------------|------------|
| react-native-maps (Google Maps) | Kakao Maps JS SDK |
| expo-location | navigator.geolocation |
| expo-image-picker | `<input type="file" accept="image/*">` |
| expo-file-system (Base64) | File 객체 직접 업로드 |
| AsyncStorage | (Supabase가 내부적으로 localStorage 사용) |
| Modal (RN) | CSS position:fixed 오버레이 |
| Stack Navigator | React Router useNavigate |
| Tab Navigator | 하단 고정 `<nav>` + NavLink |
