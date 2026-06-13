-- ============================================================
-- FINDER v2 마이그레이션
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 RUN 하세요
-- ============================================================

-- 1) official_cases: 상세 정보(실종일/대상/착의/특징 등) 저장용 컬럼
ALTER TABLE official_cases ADD COLUMN IF NOT EXISTS occr_date TEXT;
ALTER TABLE official_cases ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- 2) sightings: 공식 케이스에도 커뮤니티 기록(목격/제보)을 달 수 있도록
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS official_case_id UUID REFERENCES official_cases(id);
ALTER TABLE sightings ALTER COLUMN report_id DROP NOT NULL;

-- 3) sightings RLS: 로그인 사용자가 읽고 쓸 수 있도록 (커뮤니티 제보)
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sightings_select_all" ON sightings;
CREATE POLICY "sightings_select_all" ON sightings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "sightings_insert_auth" ON sightings;
CREATE POLICY "sightings_insert_auth" ON sightings
  FOR INSERT WITH CHECK (TRUE);

-- 완료! 이제 서버를 재시작하면 상세정보가 채워집니다.
