import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import DetailPage from './pages/DetailPage';

function BottomNav({ onLogout }) {
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
      <button
        onClick={onLogout}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '10px 0 14px',
          fontSize: 11, color: 'var(--text-muted)', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 22 }}>👤</span>
        <span>로그아웃</span>
      </button>
    </nav>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="spinner" style={{ marginTop: 120 }} />;
  if (!session) return <AuthPage />;

  const handleLogout = () => supabase.auth.signOut();

  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav onLogout={handleLogout} />
    </>
  );
}
