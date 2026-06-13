import { useState } from 'react';

// 항상 노출되는 공지사항 배너 (탭하면 상세 펼침)
export default function NoticeBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: '#FFF8E6', borderBottom: '1px solid #F2E2B8' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13 }}>📢</span>
        <span style={{ fontSize: 11.5, color: '#8A6D1B', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          경찰청 안전Dream 공식 데이터 · 매시간 갱신 · 실제 신고는 ☎182
        </span>
        <span style={{ fontSize: 10, color: '#B89432' }}>{open ? '닫기 ▲' : '자세히 ▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 14px', fontSize: 12, color: '#6B5618', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>
            <b>📍 정보 출처</b><br />
            경찰청 <b>안전Dream(safe182.go.kr)</b> 공식 실종경보 데이터를 표시합니다.
            본 앱은 비영리 시민 참여 서비스이며, 경찰청과 직접적인 제휴 관계는 없습니다.
          </p>
          <p style={{ marginBottom: 8 }}>
            <b>🔄 갱신 주기</b><br />
            서버가 <b>매시간 자동</b>으로 안전Dream의 최신 실종 정보를 가져와 갱신합니다.
            실제 경찰 데이터와 최대 1시간의 시차가 있을 수 있습니다.
          </p>
          <p style={{ marginBottom: 8 }}>
            <b>🚨 실제 신고 / 제보 방법 (중요)</b><br />
            앱 안의 "기억하기·목격 기록"은 <b>시민들이 함께 단서를 모으는 참고용</b>입니다.
            실제 효력이 있는 신고는 반드시 아래로 해주세요.
          </p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li><b>실종 신고·목격 제보:</b> 경찰청 실종아동찾기센터 <b>☎ 182</b> (24시간)</li>
            <li><b>긴급 상황·범죄 의심:</b> <b>☎ 112</b></li>
            <li><b>온라인 신고:</b> 안전Dream 앱 또는 safe182.go.kr</li>
          </ul>
          <p style={{ fontSize: 11, color: '#9A8246' }}>
            ※ 실종자를 직접 발견하면 접근·이동시키지 말고 즉시 182 또는 112에 위치를 알려주세요.
          </p>
        </div>
      )}
    </div>
  );
}
