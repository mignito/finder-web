import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import DetailPage from './pages/DetailPage';
import Logo from './components/Logo';

function BottomNav() {
  const location = useLocation();
  const isMap = location.pathname === '/';
  const isReport = location.pathname === '/report';

  return (
    <nav className="bottom-nav">
      {/* 왼쪽: 목격 제보 */}
      <NavLink to="/report" className={`bnav-item ${isReport ? 'active' : ''}`}>
        <span className="bnav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </span>
        <span className="bnav-label">목격했어요</span>
        <span className="bnav-sub">제보 등록</span>
      </NavLink>

      {/* 중앙: FINDER 메인 */}
      <NavLink to="/" className={`bnav-center ${isMap ? 'active' : ''}`}>
        <span className="bnav-center-logo">
          <Logo size={28} color={isMap ? '#fff' : '#2A9D8F'} />
        </span>
        <span className="bnav-label">FINDER</span>
        <span className="bnav-sub">실종자 찾기</span>
      </NavLink>

      {/* 오른쪽: 신고 등록 */}
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
