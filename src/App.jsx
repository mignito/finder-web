import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import DetailPage from './pages/DetailPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import Logo from './components/Logo';

function BottomNav() {
  const location = useLocation();
  const isMap = location.pathname === '/';
  const isReport = location.pathname === '/report';
  const isProfile = location.pathname === '/profile';

  return (
    <nav className="bottom-nav">
      {/* 왼쪽: 신고 등록 */}
      <NavLink to="/report" className={`bnav-item ${isReport ? 'active' : ''}`}>
        <span className="bnav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="19" cy="19" r="4" fill="currentColor"/>
            <path d="M19 17v2M19 21v.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="bnav-label">신고하기</span>
        <span className="bnav-sub">실종 등록</span>
      </NavLink>

      {/* 중앙: FINDER 메인 */}
      <NavLink to="/" className={`bnav-center ${isMap ? 'active' : ''}`}>
        <span className="bnav-center-logo">
          <Logo size={28} color={isMap ? '#fff' : 'var(--primary)'} />
        </span>
        <span className="bnav-label">FINDER</span>
        <span className="bnav-sub">실종자 찾기</span>
      </NavLink>

      {/* 오른쪽: 내 정보 */}
      <NavLink to="/profile" className={`bnav-item ${isProfile ? 'active' : ''}`}>
        <span className="bnav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="bnav-label">내 정보</span>
        <span className="bnav-sub">신고 관리</span>
      </NavLink>
    </nav>
  );
}

function ProtectedRoute({ session, children }) {
  if (!session) return <AuthPage />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 로드
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 세션 변경 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="spinner" />;

  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage session={session} />} />
        <Route path="/detail/:id" element={<DetailPage session={session} />} />
        <Route path="/report" element={
          <ProtectedRoute session={session}>
            <ReportPage session={session} />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute session={session}>
            <ProfilePage session={session} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
}

