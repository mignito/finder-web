import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatMissingDate, targetTypeLabel } from '../lib/format';

async function uploadImage(file, folder) {
  const ext = file.name.split('.').pop();
  const filename = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(filename, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(filename).data.publicUrl;
}

function formatTime(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [report, setReport] = useState(null);
  const [isOfficial, setIsOfficial] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 1) 사용자 신고에서 먼저 조회
      const { data: r } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
      if (r) {
        setReport(r);
        setIsOfficial(false);
        const { data: s } = await supabase.from('sightings').select('*').eq('report_id', id).order('created_at', { ascending: true });
        setSightings(s || []);
        setFetching(false);
        return;
      }
      // 2) 공식 케이스(안전Dream)에서 조회
      const { data: oc } = await supabase.from('official_cases').select('*').eq('id', id).maybeSingle();
      if (oc) {
        setReport(oc);
        setIsOfficial(true);
        const { data: s } = await supabase.from('sightings').select('*').eq('official_case_id', id).order('created_at', { ascending: true });
        setSightings(s || []);
      }
      setFetching(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!mapOpen || !mapRef.current || !window.kakao || !report) return;
    const { kakao } = window;

    const center = new kakao.maps.LatLng(report.last_seen_lat, report.last_seen_lng);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });
    mapInstance.current = map;

    // 실종 위치 (회색)
    new kakao.maps.Marker({
      position: center, map,
      image: new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_gray.png',
        new kakao.maps.Size(28, 40)
      ),
    });

    markerRef.current = pendingCoords
      ? new kakao.maps.Marker({ position: new kakao.maps.LatLng(pendingCoords.lat, pendingCoords.lng), map })
      : null;

    kakao.maps.event.addListener(map, 'click', (e) => {
      const latLng = e.latLng;
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new kakao.maps.Marker({ position: latLng, map });
      setPendingCoords({ lat: latLng.getLat(), lng: latLng.getLng() });
    });
  }, [mapOpen]);

  const fetchSightings = async () => {
    const col = isOfficial ? 'official_case_id' : 'report_id';
    const { data } = await supabase.from('sightings').select('*').eq(col, id).order('created_at', { ascending: true });
    setSightings(data || []);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) { alert('기억하거나 목격한 내용을 입력해주세요'); return; }
    setLoading(true);
    try {
      let lat = report.last_seen_lat, lng = report.last_seen_lng;
      if (selectedCoords) { lat = selectedCoords.lat; lng = selectedCoords.lng; }
      else {
        await new Promise(res => navigator.geolocation?.getCurrentPosition(
          ({ coords: c }) => { lat = c.latitude; lng = c.longitude; res(); },
          () => res(), { timeout: 3000 }
        ));
      }
      let photoUrl = null;
      if (imageFile) photoUrl = await uploadImage(imageFile, 'sightings');
      const row = {
        description: text,
        sighting_lat: lat, sighting_lng: lng, photo_url: photoUrl,
      };
      if (isOfficial) row.official_case_id = id; else row.report_id = id;
      const { error } = await supabase.from('sightings').insert(row);
      if (error) throw error;
      setText(''); setImageFile(null); setImagePreview(null); setSelectedCoords(null);
      await fetchSightings();
    } catch (err) { alert('오류: ' + err.message); }
    setLoading(false);
  };

  if (fetching) return <div className="spinner" />;
  if (!report) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>정보를 찾을 수 없어요</div>;

  const d = report.details || {};
  const genderLabel = isOfficial ? (d.gender || '') : '';
  const missingDate = isOfficial ? formatMissingDate(report.occr_date || d.occrDate) : null;

  // 상세 정보 행 (공식 케이스: API 전체 정보 노출)
  const infoRows = isOfficial ? [
    ['이름', report.name],
    ['당시 나이', report.age != null ? `${report.age}세` : null],
    ['현재 나이', d.ageNow ? `${d.ageNow}세` : null],
    ['성별', genderLabel],
    ['대상 구분', targetTypeLabel(d.targetType)],
    ['실종일', missingDate],
    ['발생 장소', report.last_seen_address],
    ['착의 사항', d.clothing],
    ['신체 특징', d.features],
    ['식별 코드', d.identCode],
  ].filter(([, v]) => v) : [];

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', fontSize: 20, marginRight: 12, padding: 4 }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>실종 상세</span>
        {isOfficial && (
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4A90E2', background: '#EAF2FC', padding: '2px 8px', borderRadius: 10 }}>
              안전Dream
            </span>
            <span style={{ fontSize: 9, color: '#999' }}>경찰청 공식 데이터</span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, background: 'var(--primary-light)', borderBottom: '1px solid var(--primary-border)' }}>
        {report.photo_url && (
          <img src={report.photo_url} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {missingDate && <span className="badge-urgent">🔴 실종 {missingDate}</span>}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {isOfficial ? `${report.name}님을 찾습니다` : `${report.pet_name}를 찾아주세요`}
            </h2>
            {isOfficial ? (
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>
                {targetTypeLabel(d.targetType)} · {report.age != null ? `${report.age}세` : ''} {genderLabel}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>{report.pet_type} · {report.pet_breed} · {report.pet_age}세</p>
            )}
          </div>
          {!isOfficial && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>현상금</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{(report.reward || 0).toLocaleString()}원</p>
            </div>
          )}
        </div>
        {report.last_seen_address && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>📍 {report.last_seen_address}</p>}
      </div>

      {/* 공식 케이스: API 전체 상세 정보 */}
      {isOfficial && infoRows.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>상세 정보</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {infoRows.map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '5px 0', color: 'var(--text-muted)', width: 84, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ padding: '5px 0', color: '#222', lineHeight: 1.5 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 커뮤니티 기록 안내 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>🤝 함께 기억하기 · 목격 제보 {sightings.length}건</span>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
          이 분을 본 적 있거나 단서가 있다면 사진·위치와 함께 남겨주세요.
          <b style={{ color: '#C0392B' }}> 실제 신고는 ☎182</b>로 꼭 해주세요.
        </p>
      </div>

      {sightings.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', lineHeight: 1.8 }}>
          아직 기록이 없어요<br />첫 번째로 단서를 남겨주세요 👀
        </p>
      ) : sightings.map(s => (
        <div key={s.id} style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>익명 제보자</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(s.created_at)} · 📍 위치 첨부됨</p>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{s.description}</p>
          {s.photo_url && <img src={s.photo_url} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 200, objectFit: 'cover' }} />}
        </div>
      ))}

      {/* 기록 입력창 */}
      <form onSubmit={handleSubmit} style={{
        position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--max-width)',
        background: 'white', borderTop: '1px solid var(--border)', padding: 12, zIndex: 50,
      }}>
        {imagePreview && (
          <div style={{ position: 'relative', marginBottom: 8, display: 'inline-block' }}>
            <img src={imagePreview} alt="" style={{ height: 60, borderRadius: 6, objectFit: 'cover' }} />
            <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
              style={{ position: 'absolute', top: -6, right: -6, background: '#333', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 11 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => fileRef.current.click()}
            style={{ padding: 8, borderRadius: 20, border: '1px solid #ddd', background: imageFile ? 'var(--primary-light)' : 'white', fontSize: 18, flexShrink: 0 }}>
            {imageFile ? '📷✅' : '📷'}
          </button>
          <button type="button" onClick={() => { setPendingCoords(selectedCoords); setMapOpen(true); }}
            style={{ padding: 8, borderRadius: 20, border: `1px solid ${selectedCoords ? 'var(--primary)' : '#ddd'}`, background: selectedCoords ? 'var(--primary-light)' : 'white', fontSize: 18, flexShrink: 0 }}>
            {selectedCoords ? '📍✅' : '📍'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          <input className="input" style={{ flex: 1, borderRadius: 20, padding: '8px 14px' }}
            placeholder="기억하거나 목격한 내용..." value={text} onChange={e => setText(e.target.value)} />
          <button type="submit" disabled={loading}
            style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {loading ? '...' : '기록'}
          </button>
        </div>
      </form>

      {mapOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMapOpen(false)}>
          <div className="modal-sheet" style={{ height: '80dvh' }}>
            <div className="modal-header">
              <span style={{ fontSize: 14, fontWeight: 600 }}>목격 위치를 클릭해주세요 (회색=실종위치)</span>
              <button className="modal-close" onClick={() => setMapOpen(false)}>✕</button>
            </div>
            <div ref={mapRef} style={{ flex: 1 }} />
            <div style={{ padding: 12 }}>
              <button type="button" className="btn-primary"
                onClick={() => { setSelectedCoords(pendingCoords); setMapOpen(false); }}>
                {pendingCoords ? '이 위치로 확정 ✓' : '지도를 클릭해서 위치 선택'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
