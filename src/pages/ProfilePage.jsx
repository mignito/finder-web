import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function ProfilePage({ session }) {
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = session?.user?.email;

  const fetchMyReports = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyReports(data || []);
    } catch (err) {
      console.error('내 신고 목록 로드 오류:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [session]);

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const toggleStatus = async (reportId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'found' : 'active';
    const confirmMsg = nextStatus === 'found'
      ? '축하합니다! 이 반려동물을 발견(찾았음) 완료 상태로 변경하시겠습니까?\n변경 시 지도에서 마커가 사라집니다.'
      : '신고 상태를 다시 찾기(활성) 상태로 변경하시겠습니까?';

    if (window.confirm(confirmMsg)) {
      try {
        const { error } = await supabase
          .from('reports')
          .update({ status: nextStatus })
          .eq('id', reportId);
        if (error) throw error;
        await fetchMyReports();
      } catch (err) {
        alert('상태 업데이트 오류: ' + err.message);
      }
    }
  };

  return (
    <div className="page" style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>내 정보</h2>
      </div>

      {/* Profile Card */}
      <div style={{
        background: 'var(--primary-light)',
        border: '1px solid var(--primary-border)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        marginBottom: 28,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '2px solid var(--primary-border)' }}>
          👤
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{userEmail}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>FINDER 회원</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'white',
            color: '#FF3B30',
            border: '1px solid #FFC7C4',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          로그아웃 🐾
        </button>
      </div>

      {/* My Reports Section */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          📋 내가 등록한 신고 <span style={{ color: 'var(--primary)', fontSize: 14 }}>{myReports.length}</span>
        </h3>

        {loading ? (
          <div className="spinner" />
        ) : myReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fafafa', borderRadius: 12, border: '1px dashed #ddd', color: 'var(--text-muted)', fontSize: 13 }}>
            등록한 실종 신고가 없습니다.<br />도움받기 탭에서 신고를 등록해보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myReports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  opacity: report.status === 'found' ? 0.75 : 1
                }}
              >
                {/* Image or Logo */}
                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {report.photo_url ? (
                    <img src={report.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Logo size={24} />
                  )}
                </div>

                {/* Info */}
                <div onClick={() => navigate(`/detail/${report.id}`)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{report.pet_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{report.pet_breed || report.pet_type}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    📍 {report.last_seen_address}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {report.reward > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>
                        💰 {(report.reward / 10000).toFixed(0)}만원
                      </span>
                    )}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: report.status === 'found' ? '#2A9D8F' : '#FF9500',
                      background: report.status === 'found' ? '#E6F6F4' : '#FFF5E6',
                      padding: '1px 5px',
                      borderRadius: 4
                    }}>
                      {report.status === 'found' ? '발견 완료' : '찾는 중'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => toggleStatus(report.id, report.status)}
                    style={{
                      background: report.status === 'found' ? '#f0f0f0' : 'var(--primary)',
                      color: report.status === 'found' ? '#666' : 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: report.status === 'found' ? 'none' : '0 2px 6px rgba(42, 157, 143, 0.2)'
                    }}
                  >
                    {report.status === 'found' ? '다시찾기' : '찾았어요! 🎉'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
