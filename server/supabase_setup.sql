-- ==================== official_cases 테이블 생성 ====================
-- 안전Dream API에서 수집한 공식 실종자 정보

CREATE TABLE IF NOT EXISTS official_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  official_id TEXT UNIQUE NOT NULL,  -- 안전Dream에서 받은 고유 ID
  name TEXT NOT NULL,                -- 실종자 이름
  age INTEGER,                       -- 나이

  -- 위치 정보
  last_seen_address TEXT,            -- 마지막 목격 주소
  last_seen_lat FLOAT8,              -- 위도
  last_seen_lng FLOAT8,              -- 경도

  -- 부가 정보
  photo_url TEXT,                    -- 사진 URL
  description TEXT,                  -- 설명

  -- 상태
  status TEXT DEFAULT 'active',      -- 'active' / 'found'

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_status CHECK (status IN ('active', 'found'))
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_official_cases_coords
  ON official_cases(last_seen_lat, last_seen_lng);

CREATE INDEX IF NOT EXISTS idx_official_cases_status
  ON official_cases(status);

CREATE INDEX IF NOT EXISTS idx_official_cases_created
  ON official_cases(created_at DESC);

-- ==================== 행 레벨 보안 (RLS) ====================
-- 모두 읽기 가능, 읽기만 가능 (쓰기는 서버에서만)

ALTER TABLE official_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공식 케이스 읽기 허용"
  ON official_cases FOR SELECT
  USING (TRUE);

-- 참고: INSERT/UPDATE/DELETE는 서버에서만 수행 (RLS 정책 없음 = 제한됨)

-- ==================== 테스트 데이터 (선택사항) ====================
-- 개발 중에 테스트하려면 아래 코드 활성화

-- INSERT INTO official_cases (official_id, name, age, last_seen_address, last_seen_lat, last_seen_lng, description)
-- VALUES
--   ('SAFE182_001', '김민준', 12, '서울시 강남구 역삼동', 37.5172, 127.0473, '파란색 가방 소지'),
--   ('SAFE182_002', '이지은', 8, '경기도 수원시 팔달구', 37.2636, 127.0086, '분홍색 옷 착용'),
--   ('SAFE182_003', '박준호', 15, '대전시 중구', 36.3256, 127.4211, '검정색 후드티');

-- ==================== 조회 쿼리 예시 ====================

-- 1. 모든 활성 케이스 조회
-- SELECT * FROM official_cases WHERE status = 'active' ORDER BY created_at DESC;

-- 2. 특정 좌표 반경 내 케이스 조회 (약 10km)
-- SELECT * FROM official_cases
-- WHERE status = 'active'
-- AND (6371 * acos(cos(radians(37.5)) * cos(radians(last_seen_lat)) *
--      cos(radians(last_seen_lng) - radians(127.0)) + sin(radians(37.5)) *
--      sin(radians(last_seen_lat)))) < 10
-- ORDER BY created_at DESC;

-- 3. 최근 24시간 케이스
-- SELECT * FROM official_cases
-- WHERE status = 'active'
-- AND created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;
