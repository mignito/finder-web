// 이름 마스킹: 두 번째 글자를 *로 (서정호 → 서*호, 김민 → 김*, 박 → 박)
export function maskName(name) {
  if (!name) return '';
  const chars = [...name];
  if (chars.length < 2) return name;
  chars[1] = '*';
  return chars.join('');
}

// 실종일 포맷: "20260603" → "26.06.03"
export function formatMissingDate(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/\D/g, '');
  if (s.length !== 8) return null;
  return `${s.slice(2, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

// 대상 구분 코드 → 한글
export const TARGET_TYPE_LABEL = {
  '010': '아동(18세 미만)',
  '020': '가출인',
  '040': '시설보호무연고자',
  '060': '지적·자폐·정신장애인',
  '070': '치매질환자',
  '080': '불상(신원미상)',
};

export function targetTypeLabel(code) {
  return TARGET_TYPE_LABEL[code] || '실종자';
}
