require('dotenv').config();
const express = require('express');
const axios = require('axios');
const schedule = require('node-schedule');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const SAFE182_URL = 'https://www.safe182.go.kr/api/lcm/findChildList.do';
const AMBER_URL   = 'https://www.safe182.go.kr/api/lcm/amberList.do';

// 안전Dream 전체 대상 구분 코드
const TARGET_TYPES = ['010', '020', '040', '060', '061', '062', '070', '080'];

// ==================== 안전Dream API ====================

/**
 * 안전Dream API 단일 페이지 호출
 * detailDate1: 10년치 데이터 범위 지정
 */
async function fetchPage(page, rowSize = 100) {
  const params = new URLSearchParams();
  params.append('esntlId', process.env.SAFE182_ESNTL_ID);
  params.append('authKey', process.env.SAFE182_AUTH_KEY);
  params.append('rowSize', String(rowSize));
  params.append('page', String(page));

  TARGET_TYPES.forEach(code => params.append('writngTrgetDscds', code));

  const response = await axios.post(SAFE182_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });

  return typeof response.data === 'string'
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * 전체 페이지 순회하여 모든 데이터 수집
 * 안전Dream API 일일 한도: 1,000회 → 최대 100,000건 처리 가능
 */
async function fetchAllSafe182Data() {
  try {
    console.log('📡 안전Dream 전체 데이터 수집 시작...');

    const first = await fetchPage(1);
    const totalCount = parseInt(first.totalCount) || 0;
    const firstList = first.list || [];

    if (totalCount === 0 || firstList.length === 0) {
      console.log('⚠️ 조회된 데이터 없음 (totalCount=0)');
      return [];
    }

    const PAGE_SIZE = 100;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    console.log(`📊 전체 ${totalCount}건 / ${totalPages}페이지`);

    const allItems = [...firstList];

    for (let page = 2; page <= totalPages; page++) {
      try {
        const result = await fetchPage(page);
        const pageList = result.list || [];
        if (pageList.length === 0) break;
        allItems.push(...pageList);

        if (page % 10 === 0) {
          console.log(`  📄 ${page}/${totalPages}페이지 완료 (누적 ${allItems.length}건)`);
        }

        // API 과부하 방지
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`  ⚠️ ${page}페이지 실패:`, err.message);
      }
    }

    console.log(`✅ 수집 완료: ${allItems.length}건`);
    return allItems;
  } catch (error) {
    console.error('❌ 데이터 수집 실패:', error.message);
    return [];
  }
}

// ==================== 안전Dream 실종경보(AMBER) API ====================

async function fetchAmberPage(page, rowSize = 100) {
  const params = new URLSearchParams();
  params.append('esntlId', process.env.SAFE182_ESNTL_ID);
  params.append('authKey', process.env.SAFE182_AUTH_KEY);
  params.append('rowSize', String(rowSize));
  params.append('page', String(page));
  TARGET_TYPES.forEach(code => params.append('writngTrgetDscds', code));

  const response = await axios.post(AMBER_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });
  return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
}

async function fetchAllAmberData() {
  try {
    console.log('📡 안전Dream 실종경보(AMBER) 데이터 수집...');
    const first = await fetchAmberPage(1);
    const totalCount = parseInt(first.totalCount) || 0;
    const firstList = first.list || [];
    if (totalCount === 0 || firstList.length === 0) {
      console.log('  ⚠️ 실종경보 데이터 없음');
      return [];
    }
    const PAGE_SIZE = 100;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const allItems = [...firstList];
    for (let page = 2; page <= totalPages; page++) {
      try {
        const result = await fetchAmberPage(page);
        const list = result.list || [];
        if (list.length === 0) break;
        allItems.push(...list);
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`  ⚠️ AMBER ${page}페이지 실패:`, err.message);
      }
    }
    console.log(`  🔴 실종경보 ${allItems.length}건 수집 (전체 ${totalCount}건)`);
    return allItems;
  } catch (error) {
    console.error('❌ AMBER 수집 실패:', error.message);
    return [];
  }
}

// ==================== 포맷 ====================

// API 응답 raw item → 내부 포맷 변환
function formatCase(item, isAmber = false) {
  return {
    officialId: `safe182_${item.msspsnIdntfccd}`,
    name: item.nm || 'Unknown',
    age: item.age ?? null,
    lastSeenPlace: (item.occrAdres || '').trim(),
    occrDate: item.occrde || '',
    description: [item.etcSpfeatr, item.alldressingDscd].filter(Boolean).join(' / '),
    photoBase64: item.tknphotoFile || null,
    isAmber,
    details: {
      occrDate: item.occrde || '',
      gender: item.sexdstnDscd || '',
      age: item.age ?? null,
      ageNow: item.ageNow || '',
      targetType: item.writngTrgetDscd || '',
      clothing: item.alldressingDscd || '',
      features: item.etcSpfeatr || '',
      address: (item.occrAdres || '').trim(),
      identCode: item.msspsnIdntfccd || '',
      // AMBER 전용 신체 정보
      height: item.height || null,
      weight: item.bdwgh || null,
      hairColor: item.haircolrDscd || '',
      hairShape: item.hairshpeDscd || '',
      faceShape: item.faceshpeDscd || '',
      build: item.frmDscd || '',
      nationality: item.nltyDscd || '',
      isAmberAlert: isAmber,
    },
  };
}

// ==================== 유틸 ====================

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.9780 };

async function addressToCoords(address) {
  try {
    if (!address || address.includes('미상')) return DEFAULT_COORDS;

    const headers = { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` };
    const BASE = 'https://dapi.kakao.com/v2/local';

    // 1차: 주소 검색
    const addrRes = await axios.get(`${BASE}/search/address.json`, {
      params: { query: address }, headers, timeout: 5000,
    });
    if (addrRes.data?.documents?.length > 0) {
      const d = addrRes.data.documents[0];
      return { lat: parseFloat(d.y), lng: parseFloat(d.x) };
    }

    // 2차: 키워드 검색
    const kwRes = await axios.get(`${BASE}/search/keyword.json`, {
      params: { query: address }, headers, timeout: 5000,
    });
    if (kwRes.data?.documents?.length > 0) {
      const d = kwRes.data.documents[0];
      return { lat: parseFloat(d.y), lng: parseFloat(d.x) };
    }

    // 3차: 시/구 단위로 축약
    const region = address.split(' ').slice(0, 2).join(' ');
    if (region && region !== address) {
      const regionRes = await axios.get(`${BASE}/search/keyword.json`, {
        params: { query: region }, headers, timeout: 5000,
      });
      if (regionRes.data?.documents?.length > 0) {
        const d = regionRes.data.documents[0];
        return { lat: parseFloat(d.y), lng: parseFloat(d.x) };
      }
    }

    return DEFAULT_COORDS;
  } catch {
    return DEFAULT_COORDS;
  }
}

async function uploadPhotoToStorage(officialId, base64) {
  try {
    if (!base64) return null;
    const buffer = Buffer.from(base64, 'base64');
    const filename = `official/${officialId}.jpg`;
    const { error } = await supabase.storage
      .from('photos')
      .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error(`  ⚠️ 사진 업로드 실패 (${officialId}):`, error.message);
      return null;
    }
    return supabase.storage.from('photos').getPublicUrl(filename).data.publicUrl;
  } catch (e) {
    console.error(`  ⚠️ 사진 처리 오류 (${officialId}):`, e.message);
    return null;
  }
}

// ==================== 동기화 ====================

async function syncOfficialCasesToSupabase() {
  try {
    console.log('\n🔄 [안전Dream 동기화 시작]');

    // 1. 실종검색 + 실종경보 병렬 수집
    const [regularItems, amberItems] = await Promise.all([
      fetchAllSafe182Data(),
      fetchAllAmberData(),
    ]);

    if (regularItems.length === 0 && amberItems.length === 0) {
      console.log('⚠️ 수집된 데이터 없음 - 동기화 중단');
      return { synced: 0, updated: 0, deactivated: 0 };
    }

    // 2. AMBER ID 세트 구성 후 병합
    const amberIdSet = new Set(amberItems.map(i => String(i.msspsnIdntfccd)));
    const mergedMap = new Map();
    regularItems.forEach(i => {
      const key = String(i.msspsnIdntfccd);
      mergedMap.set(key, { item: i, isAmber: amberIdSet.has(key) });
    });
    amberItems.forEach(i => {
      const key = String(i.msspsnIdntfccd);
      if (!mergedMap.has(key)) mergedMap.set(key, { item: i, isAmber: true });
    });

    const amberOnlyCount = amberItems.filter(i => !mergedMap.has(String(i.msspsnIdntfccd)) || !regularItems.find(r => String(r.msspsnIdntfccd) === String(i.msspsnIdntfccd))).length;
    console.log(`  📊 실종검색: ${regularItems.length}건 | 실종경보: ${amberItems.length}건 | 경보전용 신규: ${amberItems.length - (amberItems.length - amberIdSet.size)}건`);

    const cases = [...mergedMap.values()].map(({ item, isAmber }) => formatCase(item, isAmber));
    const apiIdSet = new Set(cases.map(c => c.officialId));

    // 2. DB 기존 데이터 로드 (official_id, photo_url, status)
    const { data: dbRecords, error: dbErr } = await supabase
      .from('official_cases')
      .select('id, official_id, photo_url, status');

    if (dbErr) throw dbErr;

    const dbMap = new Map((dbRecords || []).map(r => [r.official_id, r]));

    let synced = 0, updated = 0, deactivated = 0, failed = 0;

    // 3. 신규 삽입 + 기존 업데이트
    for (const c of cases) {
      try {
        const existing = dbMap.get(c.officialId);
        const coords = await addressToCoords(c.lastSeenPlace);

        if (existing) {
          // 기존 레코드 업데이트 (사진은 이미 있으므로 유지)
          const mergedDetails = { ...c.details, isAmberAlert: c.isAmber };
          const { error } = await supabase
            .from('official_cases')
            .update({
              name: c.name,
              age: c.age,
              last_seen_address: c.lastSeenPlace || '위치 미상',
              last_seen_lat: coords.lat,
              last_seen_lng: coords.lng,
              description: c.description,
              occr_date: c.occrDate || null,
              details: mergedDetails,
              status: 'active',
              last_updated_at: new Date(),
            })
            .eq('official_id', c.officialId);

          if (!error) updated++;
          else { console.error(`  ❌ 업데이트 실패 (${c.name}):`, error.message); failed++; }
        } else {
          // 신규 레코드 삽입
          const photoUrl = await uploadPhotoToStorage(c.officialId, c.photoBase64);
          const mergedDetails = { ...c.details, isAmberAlert: c.isAmber };

          const { error } = await supabase
            .from('official_cases')
            .insert({
              official_id: c.officialId,
              name: c.name,
              age: c.age,
              last_seen_address: c.lastSeenPlace || '위치 미상',
              last_seen_lat: coords.lat,
              last_seen_lng: coords.lng,
              photo_url: photoUrl,
              description: c.description,
              occr_date: c.occrDate || null,
              details: mergedDetails,
              status: 'active',
              created_at: new Date(),
              last_updated_at: new Date(),
            });

          if (!error) {
            synced++;
            if (synced <= 5) console.log(`  ✅ NEW: ${c.name}(${c.age}세) - ${c.lastSeenPlace}`);
          } else {
            console.error(`  ❌ 삽입 실패 (${c.name}):`, error.message);
            failed++;
          }
        }
      } catch (err) {
        console.error(`  ❌ 처리 중 오류 (${c.name}):`, err.message);
        failed++;
      }
    }

    // 4. 상태 동기화: API에서 사라진 케이스 → 'found' 처리
    for (const [officialId, dbRecord] of dbMap) {
      if (!apiIdSet.has(officialId) && dbRecord.status === 'active') {
        const { error } = await supabase
          .from('official_cases')
          .update({ status: 'found', last_updated_at: new Date() })
          .eq('official_id', officialId);

        if (!error) {
          deactivated++;
          console.log(`  🎉 발견/해제 처리: ${officialId}`);
        }
      }
    }

    console.log(`\n✅ 동기화 완료`);
    console.log(`   신규: ${synced}건 | 업데이트: ${updated}건 | 해제: ${deactivated}건 | 실패: ${failed}건`);
    return { synced, updated, deactivated, failed, total: cases.length };

  } catch (error) {
    console.error('❌ 동기화 중 오류:', error.message);
    return { synced: 0, updated: 0, deactivated: 0, error: error.message };
  }
}

// ==================== API 엔드포인트 ====================

// 수동 동기화
app.post('/api/sync', async (req, res) => {
  console.log('📥 수동 동기화 요청');
  const result = await syncOfficialCasesToSupabase();
  res.json(result);
});

// 공식 케이스 조회
app.get('/api/official-cases', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('official_cases')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    safe182: process.env.SAFE182_AUTH_KEY ? '✅ 설정됨' : '❌ 미설정',
  });
});

// ==================== 스케줄러 ====================

// 매일 새벽 3시 전체 동기화 (API 호출이 적은 시간대)
schedule.scheduleJob('0 3 * * *', async () => {
  console.log('\n⏰ [새벽 3시 정기 동기화 시작]');
  await syncOfficialCasesToSupabase();
});

// 서버 시작 시 즉시 동기화
(async () => {
  console.log('🚀 서버 시작');
  await syncOfficialCasesToSupabase();
})();

// ==================== 서버 실행 ====================

app.listen(PORT, () => {
  console.log(`\n✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/sync   (수동 동기화)`);
  console.log(`   GET  /api/official-cases\n`);
});
