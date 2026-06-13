# FINDER 프로젝트 컨텍스트

반려동물·실종자 탐색 위치 기반 커뮤니티 웹앱

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + Vite |
| 지도 | Kakao Maps JavaScript API |
| DB / Storage | Supabase (PostgreSQL + Storage) |
| 배포 | Vercel (`finder-web-red.vercel.app`) |
| Backend (sync) | Node.js + Express (`server/` 폴더, 로컬 실행) |

---

## 프로젝트 구조

```
finder-web/
├── src/
│   ├── App.jsx                  # 라우팅 (로그인 없음, 전체 공개)
│   ├── pages/
│   │   ├── MapPage.jsx          # 메인: 지도 + 목록 (핵심 파일)
│   │   ├── DetailPage.jsx       # 상세: 정보 + 목격 제보
│   │   └── ReportPage.jsx       # 신고 등록 폼
│   ├── components/
│   │   ├── Logo.jsx             # FINDER SVG 로고
│   │   └── NoticeBanner.jsx     # 상단 공지 배너
│   └── lib/
│       ├── supabase.js          # Supabase 클라이언트
│       └── format.js            # 날짜·이름 포맷 유틸
└── server/
    ├── server.js                # 안전Dream 동기화 서버 (Express)
    ├── .env                     # 실제 키값 (gitignore됨)
    ├── .env.example             # 키 구조 참고용
    └── supabase_setup.sql       # DB 스키마
```

---

## Supabase DB 구조

### `reports` (자체 신고)
```
id, pet_name, pet_type, pet_breed, pet_age,
last_seen_lat, last_seen_lng, last_seen_address,
photo_url, description, reward, status, created_at
```

### `official_cases` (안전Dream 공식 데이터)
```
id, official_id (safe182_{msspsnIdntfccd}),
name, age, last_seen_lat, last_seen_lng, last_seen_address,
photo_url, description, occr_date (YYYYMMDD),
details (JSONB), status, source, created_at, last_updated_at
```

`details` JSONB 주요 필드:
- `isAmberAlert: true` → 실종경보 발령 케이스
- `targetType` → 010(아동) 020(지적장애) 040(자폐) 060(치매) 061(노인) 062(외국인) 070(기타장애) 080(일반실종)
- `gender`, `ageNow`, `clothing`, `features`, `height`, `weight`, `hairColor`

### `sightings` (목격 제보)
```
id, report_id (자체신고 FK), official_case_id (공식 FK),
description, sighting_lat, sighting_lng, photo_url, created_at
```

---

## 데이터 소스

| API | 엔드포인트 | 건수 |
|-----|-----------|------|
| 안전Dream 실종검색 | `findChildList.do` | ~309건 |
| 안전Dream 실종경보 | `amberList.do` | ~85건 (isAmberAlert=true) |

- 공개 동의한 케이스만 API에 노출됨 (전체 실종의 약 0.4%)
- 동기화: 서버 시작 시 즉시 + 매일 새벽 3시 자동

---

## 핵심 UI 동작

### MapPage (메인)
- 카카오 지도 전체화면 + 오른쪽 세로 카드 목록
- 날짜 필터: 기본 1년, 6개월~10년 초과 드롭다운
- 정렬: 🔴 실종경보 → 안전Dream → 자체신고 → 거리순
- 마커: 실종경보=빨간테두리, 안전Dream=파란테두리, 자체신고=초록/주황/노랑
- 카드: 사진 블러 + "자세히 보기" 오버레이, 출처 배지

### DetailPage (상세)
- 공식케이스: 안전Dream 배지 + 상세정보 테이블
- 목격 제보 입력 (사진 + 지도 위치 선택)

### ReportPage (신고)
- 자체 실종 신고 등록
- Supabase Storage에 사진 업로드
- Kakao REST API로 주소→좌표 변환

---

## 환경변수

server/.env:
```
SAFE182_AUTH_KEY=8f557aabb7ad4944
SAFE182_ESNTL_ID=10000958
SUPABASE_URL=https://lvxhevbskoyludpxgkzv.supabase.co
SUPABASE_KEY=[service_role_key]
KAKAO_API_KEY=898775875ef07d32f7edbbb804cc6112
PORT=5000
```

---

## 로컬 실행 방법

```bash
# 프론트엔드
npm run dev          # http://localhost:5173

# 백엔드 (별도 터미널)
cd server
node server.js       # http://localhost:5000
# 시작 시 안전Dream 전체 동기화 자동 실행
```

---

## 현재 Phase 진행 상황

- [x] Phase 1: 지도 + 목록 + 상세 + 신고 + 목격 제보
- [x] 안전Dream 실종검색 API 연동 (전 페이지 수집)
- [x] 안전Dream 실종경보(AMBER) API 연동
- [x] 날짜 필터, 출처 배지, 로고 fallback
- [x] Vercel 배포
- [ ] Phase 2: 소셜 로그인 (선택적), 알림, 공유
- [ ] Phase 3: 백엔드 서버 클라우드 배포 (Railway/Render)
- [ ] Phase 4: 앱 전환 (React Native / PWA)
