import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { maskName, formatMissingDate } from '../lib/format';
import Logo from '../components/Logo';
import NoticeBanner from '../components/NoticeBanner';

const PET_EMOJI = { '강아지': '🐶', '고양이': '🐱' };

const FILTER_OPTIONS = [
  { label: '6개월', months: 6 },
  { label: '1년', months: 12 },
  { label: '2년', months: 24 },
  { label: '3년', months: 36 },
  { label: '4년', months: 48 },
  { label: '5년', months: 60 },
  { label: '6년', months: 72 },
  { label: '7년', months: 84 },
  { label: '8년', months: 96 },
  { label: '9년', months: 108 },
  { label: '10년 초과', months: null },
];

const getReportDate = (report) =>
  report.source === 'official' ? report.occr_date : report.created_at;

// occr_date는 "20260603" 형식 → "2026-06-03"으로 변환 후 파싱
const parseReportDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).replace(/\D/g, '');
  if (s.length === 8) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
  }
  return new Date(dateStr);
};

const isWithinFilterMonths = (report, months) => {
  if (months === null) return true;
  const dateStr = getReportDate(report);
  if (!dateStr) return true;
  const d = parseReportDate(dateStr);
  if (!d || isNaN(d.getTime())) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return d >= cutoff;
};

const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocodeCache = new Map();
const geocodeAddress = (address) => new Promise((resolve) => {
  if (!address || address.includes('미상')) return resolve(null);
  if (geocodeCache.has(address)) return resolve(geocodeCache.get(address));
  const { kakao } = window;
  if (!kakao?.maps?.services) return resolve(null);
  const geocoder = new kakao.maps.services.Geocoder();

  geocoder.addressSearch(address, (result, status) => {
    if (status === kakao.maps.services.Status.OK && result[0]) {
      const c = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
      geocodeCache.set(address, c);
      return resolve(c);
    }
    const places = new kakao.maps.services.Places();
    places.keywordSearch(address, (data, st) => {
      if (st === kakao.maps.services.Status.OK && data[0]) {
        const c = { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) };
        geocodeCache.set(address, c);
        return resolve(c);
      }
      const region = address.split(' ').slice(0, 2).join(' ');
      if (region && region !== address) {
        places.keywordSearch(region, (d2, s2) => {
          if (s2 === kakao.maps.services.Status.OK && d2[0]) {
            const c = { lat: parseFloat(d2[0].y), lng: parseFloat(d2[0].x) };
            geocodeCache.set(address, c);
            return resolve(c);
          }
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  });
});

const formatOfficialCase = (officialCase) => ({
  ...officialCase,
  pet_name: officialCase.name,
  pet_type: '사람',
  pet_breed: `${officialCase.age}세`,
  last_seen_lat: officialCase.last_seen_lat,
  last_seen_lng: officialCase.last_seen_lng,
  photo_url: officialCase.photo_url,
  occr_date: officialCase.occr_date,
  reward: 0,
  status: 'active',
  source: 'official',
});

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const [reports, setReports] = useState([]);
  const [officialCases, setOfficialCases] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [filterMonths, setFilterMonths] = useState(12);
  const geocodedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('reports').select('*').eq('status', 'active').then(({ data, error }) => {
      if (error) console.error('❌ reports 조회 실패:', error);
      if (data) setReports(data);
    });

    supabase.from('official_cases').select('*').eq('status', 'active').then(({ data, error }) => {
      if (error) console.error('❌ official_cases 조회 실패:', error);
      if (data) {
        const formatted = data.map(formatOfficialCase);
        setOfficialCases(formatted);
      }
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const createMap = () => {
      if (mapInstanceRef.current) return;
      const { kakao } = window;
      const map = new kakao.maps.Map(mapContainerRef.current, {
        center: new kakao.maps.LatLng(37.5086, 126.8912),
        level: 5,
      });
      mapInstanceRef.current = map;
      setSdkReady(true);
      navigator.geolocation?.getCurrentPosition(({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        map.setCenter(new kakao.maps.LatLng(coords.latitude, coords.longitude));
      });
    };

    if (window.kakao) {
      window.kakao.maps.load(createMap);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=898775875ef07d32f7edbbb804cc6112&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(createMap);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!sdkReady || officialCases.length === 0 || geocodedRef.current) return;
    geocodedRef.current = true;

    (async () => {
      const updated = await Promise.all(
        officialCases.map(async (c) => {
          if (!c.last_seen_address) return c;
          const coords = await geocodeAddress(c.last_seen_address);
          return coords
            ? { ...c, last_seen_lat: coords.lat, last_seen_lng: coords.lng }
            : c;
        })
      );
      setOfficialCases(updated);
    })();
  }, [sdkReady, officialCases]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao) return;
    const { kakao } = window;
    const map = mapInstanceRef.current;

    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    const allCases = [...reports, ...officialCases].filter(r => isWithinFilterMonths(r, filterMonths));

    allCases.forEach((report) => {
      if (!report.last_seen_lat || !report.last_seen_lng) return;

      const position = new kakao.maps.LatLng(report.last_seen_lat, report.last_seen_lng);
      const isAmber = report.source === 'official' && report.details?.isAmberAlert;
      const emoji = report.source === 'official' ? '🚨' : (PET_EMOJI[report.pet_type] || '🐾');

      let borderColor = '#4A90E2';
      if (isAmber) {
        borderColor = '#C53030';
      } else if (report.source !== 'official') {
        borderColor = report.reward >= 500000 ? '#FFB800' : report.reward > 0 ? '#FF9500' : '#2A9D8F';
      }

      const inner = report.photo_url
        ? `<img src="${report.photo_url}" style="width:100%;height:100%;object-fit:cover;filter:blur(5px);transform:scale(1.2);" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:24px;">${emoji}</span>`
        : `<span style="font-size:26px;line-height:1;">${emoji}</span>`;

      const content = `<div onclick="window.__goDetail?.('${report.id}')" style="width:52px;height:52px;border-radius:50%;border:3px solid ${borderColor};overflow:hidden;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.25);background:white;display:flex;align-items:center;justify-content:center;">${inner}</div>`;

      const overlay = new kakao.maps.CustomOverlay({ position, content, yAnchor: 1.2 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    window.__goDetail = (id) => navigate(`/detail/${id}`);
    return () => { delete window.__goDetail; };
  }, [reports, officialCases, navigate, filterMonths]);

  const sortedReports = [...reports, ...officialCases]
    .filter(r => isWithinFilterMonths(r, filterMonths))
    .map(r => ({
      ...r,
      distance: userLocation
        ? getDistance(userLocation.lat, userLocation.lng, r.last_seen_lat, r.last_seen_lng)
        : null,
    }))
    .sort((a, b) => {
      const aAmber = a.source === 'official' && a.details?.isAmberAlert;
      const bAmber = b.source === 'official' && b.details?.isAmberAlert;
      if (aAmber && !bAmber) return -1;
      if (!aAmber && bAmber) return 1;
      if (a.source === 'official' && b.source !== 'official') return -1;
      if (a.source !== 'official' && b.source === 'official') return 1;
      const diff = (b.reward || 0) - (a.reward || 0);
      if (diff !== 0) return diff;
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return 0;
    });

  return (
    <div style={{ position: 'relative', height: '100dvh' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 16px' }}>
          <Logo size={24} />
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', letterSpacing: 2 }}>FINDER</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>함께 찾아요</span>
        </div>
        <NoticeBanner />
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: 96, right: 8, bottom: 80,
        width: 130, overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 10, paddingTop: 10, paddingBottom: 4,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {/* 날짜 필터 */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', borderRadius: 10,
          padding: '5px 7px', boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>실종일</span>
          <select
            value={String(filterMonths)}
            onChange={e => setFilterMonths(e.target.value === 'null' ? null : Number(e.target.value))}
            style={{
              flex: 1, fontSize: 10, padding: '3px 4px', borderRadius: 6,
              border: '1px solid #ddd', background: 'white', color: '#333',
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={String(opt.months)} value={String(opt.months)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 데이터 출처 안내 */}
        <div style={{
          background: 'rgba(255,255,255,0.92)', borderRadius: 10,
          padding: '6px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          flexShrink: 0, fontSize: 8.5, lineHeight: 1.7, color: '#666',
        }}>
          <div style={{ fontWeight: 700, color: '#444', marginBottom: 2, fontSize: 9 }}>데이터 출처</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C53030', display: 'inline-block', flexShrink: 0 }} />
            <span><b style={{ color: '#C53030' }}>실종경보</b> — AMBER Alert</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4A90E2', display: 'inline-block', flexShrink: 0 }} />
            <span><b style={{ color: '#4A90E2' }}>안전Dream</b> — 경찰청 공식</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', flexShrink: 0 }} />
            <span><b style={{ color: 'var(--primary)' }}>자체신고</b> — FINDER 등록</span>
          </div>
          <div style={{ marginTop: 4, color: '#aaa', fontSize: 8, lineHeight: 1.5 }}>
            실종 신고는 반드시<br />
            <b style={{ color: '#C0392B' }}>☎ 182</b> (실종신고)로 해주세요
          </div>
        </div>

        {sortedReports.map(report => (
          <div key={report.id}
            onClick={() => navigate(`/detail/${report.id}`)}
            style={{
              background: 'white', borderRadius: 12,
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
              cursor: 'pointer', border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: 84, background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}>
              {report.photo_url
                ? <img src={report.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px)', transform: 'scale(1.15)' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-light)' }}>
                    <Logo size={38} />
                  </div>
              }
              {/* 자세히 보기 오버레이 */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.18)',
              }}>
                <span style={{
                  background: 'rgba(255,255,255,0.92)',
                  color: '#333', fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 10,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  letterSpacing: 0.3,
                }}>자세히 보기</span>
              </div>
              {report.source === 'official' && report.details?.isAmberAlert && (
                <span style={{
                  position: 'absolute', top: 5, right: 5,
                  background: '#C53030', color: 'white',
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
                  zIndex: 2,
                }}>경보</span>
              )}
              {report.reward > 0 && (
                <span style={{
                  position: 'absolute', top: 5, left: 5,
                  background: report.reward >= 500000 ? '#FFB800' : '#FF9500',
                  color: 'white',
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
                  zIndex: 1,
                }}>보상</span>
              )}
            </div>
            <div style={{ padding: '7px 8px 8px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {report.source === 'official' ? maskName(report.pet_name) : report.pet_name}
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {report.source === 'official'
                  ? (formatMissingDate(report.occr_date) ? `실종 ${formatMissingDate(report.occr_date)}` : (report.pet_breed || ''))
                  : (report.pet_breed || report.pet_type)}
              </div>
              {report.reward > 0 && (
                <div style={{ fontSize: 10, color: '#FF9500', marginTop: 3, fontWeight: 700 }}>
                  💰 {(report.reward / 10000).toFixed(0)}만원
                </div>
              )}
              {report.distance != null && (
                <div style={{ fontSize: 10, color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>
                  📍 {report.distance < 1 ? `${Math.round(report.distance * 1000)}m` : `${report.distance.toFixed(1)}km`}
                </div>
              )}
              {/* 데이터 출처 뱃지 */}
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
                {report.source === 'official' && report.details?.isAmberAlert && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 5, background: '#FEE2E2', color: '#C53030',
                    border: '1px solid #FCA5A5', letterSpacing: 0.2,
                  }}>🚨 경보</span>
                )}
                {report.source === 'official'
                  ? <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px',
                      borderRadius: 5, background: '#EAF2FC', color: '#4A90E2',
                      border: '1px solid #C5DCFA', letterSpacing: 0.2,
                    }}>안전Dream</span>
                  : <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px',
                      borderRadius: 5, background: 'var(--primary-light)', color: 'var(--primary)',
                      border: '1px solid var(--primary-border)', letterSpacing: 0.2,
                    }}>자체신고</span>
                }
              </div>
            </div>
          </div>
        ))}
        {sortedReports.length === 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: 12,
            padding: '12px 8px', textAlign: 'center',
            fontSize: 11, color: '#999', lineHeight: 1.6,
          }}>
            <Logo size={28} color="#ccc" />
            <br />해당 기간<br />내역 없음
          </div>
        )}
      </div>
    </div>
  );
}
