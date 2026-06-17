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

export default function ReportPage({ session }) {
  const navigate = useNavigate();
  const fileRef = useRef();
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('pet'); // 'pet' or 'person'

  // 동물 실종 신고 폼 상태
  const [petForm, setPetForm] = useState({
    petName: '', petType: '강아지', petBreed: '', petAge: '', reward: '', description: ''
  });

  // 사람 실종 신고 폼 상태
  const [personForm, setPersonForm] = useState({
    name: '', gender: '남성', age: '', targetType: '아동 (만 18세 미만)', clothing: '', features: ''
  });

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setImage(null);
    setImageFile(null);
    setCoords(null);
    setAddress('');
    setPendingCoords(null);
  };

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
    setLoading(true);
    try {
      let photoUrl = null;
      if (imageFile) photoUrl = await uploadImage(imageFile, 'reports');

      let insertData = {};

      if (activeTab === 'pet') {
        if (!petForm.petName) { alert('반려동물 이름을 입력해주세요'); setLoading(false); return; }
        if (!coords) { alert('지도에서 위치를 선택해주세요'); setLoading(false); return; }
        insertData = {
          pet_name: petForm.petName,
          pet_type: petForm.petType,
          pet_breed: petForm.petBreed,
          pet_age: petForm.petAge ? parseInt(petForm.petAge) : null,
          description: petForm.description,
          reward: petForm.reward ? parseInt(petForm.reward) : 0,
          last_seen_address: address,
          last_seen_lat: coords.lat,
          last_seen_lng: coords.lng,
          photo_url: photoUrl,
          user_id: session?.user?.id,
          status: 'active'
        };
      } else {
        if (!personForm.name) { alert('실종자 성명을 입력해주세요'); setLoading(false); return; }
        if (!coords) { alert('지도에서 위치를 선택해주세요'); setLoading(false); return; }
        insertData = {
          pet_name: personForm.name,
          pet_type: '사람',
          pet_breed: `${personForm.targetType} (${personForm.gender})`,
          pet_age: personForm.age ? parseInt(personForm.age) : null,
          description: `👕 당시 착의: ${personForm.clothing}\n📝 신체 특징: ${personForm.features}`,
          reward: 0,
          last_seen_address: address,
          last_seen_lat: coords.lat,
          last_seen_lng: coords.lng,
          photo_url: photoUrl,
          user_id: session?.user?.id,
          status: 'active'
        };
      }

      const { error } = await supabase.from('reports').insert(insertData);
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

      {/* 탭 바 */}
      <div style={{ display: 'flex', background: '#fafafa', borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={() => { setActiveTab('pet'); resetForm(); }}
          style={{
            flex: 1, padding: '14px 0', fontSize: 14, fontWeight: activeTab === 'pet' ? 700 : 500,
            color: activeTab === 'pet' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === 'pet' ? 'var(--primary)' : 'transparent'}`,
            background: activeTab === 'pet' ? 'white' : 'none',
            cursor: 'pointer'
          }}>
          🐶 동물 실종 신고
        </button>
        <button type="button" onClick={() => { setActiveTab('person'); resetForm(); }}
          style={{
            flex: 1, padding: '14px 0', fontSize: 14, fontWeight: activeTab === 'person' ? 700 : 500,
            color: activeTab === 'person' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === 'person' ? 'var(--primary)' : 'transparent'}`,
            background: activeTab === 'person' ? 'white' : 'none',
            cursor: 'pointer'
          }}>
          👤 사람 실종 신고
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 이미지 업로드 영역 */}
        <div onClick={() => fileRef.current.click()}
          style={{ height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
          {image
            ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
                📷 {activeTab === 'pet' ? '반려동물 사진 추가' : '실종자 최근 사진 추가'}
              </span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />

        <div style={{ padding: '0 16px' }}>

          {/* 1) 동물 실종 신고 입력 폼 */}
          {activeTab === 'pet' && (
            <>
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>동물 종류 *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['강아지', '고양이', '기타'].map(type => (
                    <button key={type} type="button" onClick={() => setPetForm(f => ({ ...f, petType: type }))}
                      style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, background: petForm.petType === type ? 'var(--primary)' : 'white', color: petForm.petType === type ? 'white' : 'var(--text-sub)', border: `1px solid ${petForm.petType === type ? 'var(--primary)' : '#ddd'}`, cursor: 'pointer', fontWeight: 600 }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>이름 *</label>
                <input className="input" type="text" placeholder="반려동물 이름" value={petForm.petName} onChange={e => setPetForm(f => ({ ...f, petName: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>품종</label>
                <input className="input" type="text" placeholder="예: 말티즈, 코리안숏헤어" value={petForm.petBreed} onChange={e => setPetForm(f => ({ ...f, petBreed: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>나이 (세)</label>
                <input className="input" type="number" placeholder="예: 3" value={petForm.petAge} onChange={e => setPetForm(f => ({ ...f, petAge: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>현상금 (원)</label>
                <input className="input" type="number" placeholder="예: 500000" value={petForm.reward} onChange={e => setPetForm(f => ({ ...f, reward: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>특징 설명</label>
                <textarea className="input" placeholder="색상, 특징, 목줄 유무, 성격 등" value={petForm.description} onChange={e => setPetForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
            </>
          )}

          {/* 2) 사람 실종 신고 입력 폼 */}
          {activeTab === 'person' && (
            <>
              {/* 중요 안내 배너 */}
              <div style={{
                background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8,
                padding: '12px 14px', marginTop: 16, fontSize: 12, color: '#C53030', lineHeight: 1.6
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠️ 중요 안내
                </div>
                실종 사고 발생 시 **즉시 경찰청(☎182)**에 먼저 정식 신고하셔야 합니다. FINDER의 신고 등록은 실종 정보를 지역 사회에 빠르게 알리고 제보를 받기 위한 보조 목적입니다.
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>실종 대상 구분 *</label>
                <select className="input" value={personForm.targetType} onChange={e => setPersonForm(f => ({ ...f, targetType: e.target.value }))} style={{ cursor: 'pointer' }}>
                  <option>아동 (만 18세 미만)</option>
                  <option>지적/자폐성/정신장애인</option>
                  <option>치매환자</option>
                  <option>일반 실종자 (기타)</option>
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>성명 *</label>
                <input className="input" type="text" placeholder="실종자 성명" value={personForm.name} onChange={e => setPersonForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>성별 *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['남성', '여성'].map(gender => (
                    <button key={gender} type="button" onClick={() => setPersonForm(f => ({ ...f, gender: gender }))}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 20, fontSize: 13, background: personForm.gender === gender ? 'var(--primary)' : 'white', color: personForm.gender === gender ? 'white' : 'var(--text-sub)', border: `1px solid ${personForm.gender === gender ? 'var(--primary)' : '#ddd'}`, cursor: 'pointer', fontWeight: 600 }}>
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>현재 나이 (세) *</label>
                <input className="input" type="number" placeholder="예: 74" value={personForm.age} onChange={e => setPersonForm(f => ({ ...f, age: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>당시 착의 사항 *</label>
                <input className="input" type="text" placeholder="예: 빨간 모자, 휠체어 탑승, 남색 파카" value={personForm.clothing} onChange={e => setPersonForm(f => ({ ...f, clothing: e.target.value }))} />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>신체 특징 및 상세 인적 사항</label>
                <textarea className="input" placeholder="걸음걸이, 말투, 점 등의 신체 특징" value={personForm.features} onChange={e => setPersonForm(f => ({ ...f, features: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
            </>
          )}

          {/* 공통: 마지막 목격 위치 지도 트리거 */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>마지막 목격 위치 *</label>
            <button type="button" onClick={() => { setPendingCoords(coords); setMapOpen(true); }}
              style={{ width: '100%', padding: 14, borderRadius: 8, fontSize: 14, background: coords ? 'var(--primary-light)' : '#f5f5f5', color: coords ? 'var(--primary)' : 'var(--text-sub)', border: `1px solid ${coords ? 'var(--primary)' : '#ddd'}`, fontWeight: 600, cursor: 'pointer' }}>
              {coords ? '📍 위치 선택됨 (다시 선택)' : '🗺 지도에서 위치 선택'}
            </button>
            {address && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-sub)' }}>{address}</p>}
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 24, marginBottom: 8, cursor: 'pointer' }}>
            {loading ? '등록 중...' : '실종 신고 등록하기'}
          </button>
        </div>
      </form>

      {mapOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMapOpen(false)}>
          <div className="modal-sheet" style={{ height: '85dvh' }}>
            <div className="modal-header">
              <span style={{ fontSize: 15, fontWeight: 600 }}>잃어버린 위치를 클릭해주세요</span>
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
