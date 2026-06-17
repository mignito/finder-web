import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import DetailPage from './pages/DetailPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';

function BottomNav() {
  const location = useLocation();
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
        <span>🧭</span>
        <span>도움주기</span>
      </NavLink>
      <NavLink to="/report" className={location.pathname === '/report' ? 'active' : ''}>
        <span>📋</span>
        <span>도움받기</span>
      </NavLink>
      <NavLink to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
        <span>👤</span>
        <span>내 정보</span>
      </NavLink>
    </nav>
  );
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
  if (!session) return <AuthPage />;

  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage session={session} />} />
        <Route path="/report" element={<ReportPage session={session} />} />
        <Route path="/detail/:id" element={<DetailPage session={session} />} />
        <Route path="/profile" element={<ProfilePage session={session} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
}

