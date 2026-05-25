import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PET_EMOJI = { '강아지': '🐶', '고양이': '🐱' };

const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('reports').select('*').eq('status', 'active').then(({ data }) => {
      if (data) setReports(data);
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
    if (!mapInstanceRef.current || !window.kakao) return;
    const { kakao } = window;
    const map = mapInstanceRef.current;

    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    reports.forEach((report) => {
      const position = new kakao.maps.LatLng(report.last_seen_lat, report.last_seen_lng);
      const emoji = PET_EMOJI[report.pet_type] || '🐾';
      const borderColor = report.reward >= 500000 ? '#FFB800' : report.reward > 0 ? '#FF9500' : '#2A9D8F';

      const inner = report.photo_url
        ? `<img src="${report.photo_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:24px;">${emoji}</span>`
        : `<span style="font-size:26px;line-height:1;">${emoji}</span>`;

      const content = `<div onclick="window.__goDetail?.('${report.id}')" style="width:52px;height:52px;border-radius:50%;border:3px solid ${borderColor};overflow:hidden;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.25);background:white;display:flex;align-items:center;justify-content:center;">${inner}</div>`;

      const overlay = new kakao.maps.CustomOverlay({ position, content, yAnchor: 1.2 });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    window.__goDetail = (id) => navigate(`/detail/${id}`);
    return () => { delete window.__goDetail; };
  }, [reports, navigate]);

  const sortedReports = [...reports]
    .map(r => ({
      ...r,
      distance: userLocation
        ? getDistance(userLocation.lat, userLocation.lng, r.last_seen_lat, r.last_seen_lng)
        : null,
    }))
    .sort((a, b) => {
      // 보상 높은 순 (유료 노출)
      const diff = (b.reward || 0) - (a.reward || 0);
      if (diff !== 0) return diff;
      // 같으면 거리순
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return 0;
    });

  return (
    <div style={{ position: 'relative', height: '100dvh' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'white', padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>🐾</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', letterSpacing: 2 }}>FINDER</span>
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: 62, right: 8, bottom: 80,
        width: 130, overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 10, paddingTop: 10, paddingBottom: 4,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
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
                ? <img src={report.photo_url} alt={report.pet_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                    {PET_EMOJI[report.pet_type] || '🐾'}
                  </div>}
              {report.reward > 0 && (
                <span style={{
                  position: 'absolute', top: 5, left: 5,
                  background: report.reward >= 500000 ? '#FFB800' : '#FF9500',
                  color: 'white',
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
                }}>보상</span>
              )}
            </div>
            <div style={{ padding: '7px 8px 8px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.pet_name}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.pet_breed || report.pet_type}</div>
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
            </div>
          </div>
        ))}
        {sortedReports.length === 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: 12,
            padding: '12px 8px', textAlign: 'center',
            fontSize: 11, color: '#999', lineHeight: 1.6,
          }}>
            🐾<br />주변 실종<br />건수 없음
          </div>
        )}
      </div>
    </div>
  );
}
