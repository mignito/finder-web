import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

async function uploadImage(file, folder) {
  const ext = file.name.split('.').pop();
  const filename = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(filename, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(filename).data.publicUrl;
}

export default function ReportPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [form, setForm] = useState({ petName: '', petType: '강아지', petBreed: '', petAge: '', description: '', reward: '' });
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!mapOpen || !mapRef.current || !window.kakao) return;
    const { kakao } = window;

    const initCenter = pendingCoords
      ? new kakao.maps.LatLng(pendingCoords.lat, pendingCoords.lng)
      : new kakao.maps.LatLng(37.5665, 126.9780);

    const map = new kakao.maps.Map(mapRef.current, { center: initCenter, level: 4 });
    mapInstance.current = map;
    markerRef.current = pendingCoords
      ? new kakao.maps.Marker({ position: initCenter, map })
      : null;

    navigator.geolocation?.getCurrentPosition(({ coords: c }) => {
      if (!pendingCoords) map.setCenter(new kakao.maps.LatLng(c.latitude, c.longitude));
    });

    kakao.maps.event.addListener(map, 'click', (e) => {
      const latLng = e.latLng;
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new kakao.maps.Marker({ position: latLng, map });
      setPendingCoords({ lat: latLng.getLat(), lng: latLng.getLng() });
    });
  }, [mapOpen]);

  const useMyLocation = () => {
    if (!mapInstance.current || !window.kakao) return;
    navigator.geolocation?.getCurrentPosition(({ coords: c }) => {
      const pos = new window.kakao.maps.LatLng(c.latitude, c.longitude);
      mapInstance.current.setCenter(pos);
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new window.kakao.maps.Marker({ position: pos, map: mapInstance.current });
      setPendingCoords({ lat: c.latitude, lng: c.longitude });
    });
  };

  const confirmLocation = () => {
    if (!pendingCoords) { alert('지도를 클릭해서 위치를 선택해주세요'); return; }
    setCoords(pendingCoords);
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(pendingCoords.lng, pendingCoords.lat, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setAddress(result[0]?.address?.address_name || '위치 선택됨');
      } else {
        setAddress('위치 선택됨');
      }
    });
    setMapOpen(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.petName) { alert('반려동물 이름을 입력해주세요'); return; }
    if (!coords) { alert('지도에서 위치를 선택해주세요'); return; }
    setLoading(true);
    try {
      let photoUrl = null;
      if (imageFile) photoUrl = await uploadImage(imageFile, 'reports');
      const { error } = await supabase.from('reports').insert({
        pet_name: form.petName, pet_type: form.petType, pet_breed: form.petBreed,
        pet_age: form.petAge ? parseInt(form.petAge) : null,
        description: form.description, reward: form.reward ? parseInt(form.reward) : 0,
        last_seen_address: address, last_seen_lat: coords.lat, last_seen_lng: coords.lng,
        photo_url: photoUrl,
      });
      if (error) throw error;
      alert('실종 신고가 등록됐어요!');
      navigate('/');
    } catch (err) { alert('오류: ' + err.message); }
    setLoading(false);
  };

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>실종 신고 등록</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div onClick={() => fileRef.current.click()}
          style={{ height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
          {image
            ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>📷 반려동물 사진 추가</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />

        <div style={{ padding: '0 16px' }}>
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>동물 종류 *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['강아지', '고양이', '기타'].map(type => (
                <button key={type} type="button" onClick={() => setForm(f => ({ ...f, petType: type }))}
                  style={{ padding: '8px 16px', borderRadius: 20, fontSize: 14, background: form.petType === type ? 'var(--primary)' : 'white', color: form.petType === type ? 'white' : 'var(--text-sub)', border: `1px solid ${form.petType === type ? 'var(--primary)' : '#ddd'}` }}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'petName', label: '이름 *', placeholder: '반려동물 이름' },
            { key: 'petBreed', label: '품종', placeholder: '예: 말티즈, 코숏' },
            { key: 'petAge', label: '나이', placeholder: '예: 3', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
              <input className="input" type={type || 'text'} placeholder={placeholder} value={form[key]} onChange={set(key)} />
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>특징 설명</label>
            <textarea className="input" placeholder="색깔, 특징, 목줄 여부 등" value={form.description} onChange={set('description')} rows={3} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>현상금 (원)</label>
            <input className="input" type="number" placeholder="예: 500000" value={form.reward} onChange={set('reward')} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>마지막 목격 위치 *</label>
            <button type="button" onClick={() => { setPendingCoords(coords); setMapOpen(true); }}
              style={{ width: '100%', padding: 14, borderRadius: 8, fontSize: 15, background: coords ? 'var(--primary-light)' : '#f5f5f5', color: coords ? 'var(--primary)' : 'var(--text-sub)', border: `1px solid ${coords ? 'var(--primary)' : '#ddd'}`, fontWeight: coords ? 600 : 400 }}>
              {coords ? '📍 위치 선택됨 (다시 선택)' : '🗺 지도에서 위치 선택'}
            </button>
            {address && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-sub)' }}>{address}</p>}
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 24, marginBottom: 8 }}>
            {loading ? '등록 중...' : '실종 신고 등록하기'}
          </button>
        </div>
      </form>

      {mapOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMapOpen(false)}>
          <div className="modal-sheet" style={{ height: '85dvh' }}>
            <div className="modal-header">
              <span style={{ fontSize: 15, fontWeight: 600 }}>마지막으로 본 위치를 클릭해주세요</span>
              <button className="modal-close" onClick={() => setMapOpen(false)}>✕</button>
            </div>
            <div ref={mapRef} style={{ flex: 1 }} />
            <div style={{ padding: 16, display: 'flex', gap: 10 }}>
              <button type="button" className="btn-outline" onClick={useMyLocation}>현재 위치로</button>
              <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={confirmLocation}>
                {pendingCoords ? '이 위치로 확정 ✓' : '클릭해서 위치 선택'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
