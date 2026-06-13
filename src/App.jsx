import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import DetailPage from './pages/DetailPage';

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
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
}
