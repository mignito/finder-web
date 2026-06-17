# FINDER 개발 지침 (GEMINI.md)

## 🌐 기본 개발 언어 규칙
* **모든 개발 계획서(Implementation Plan), 작업 완료 보고서(Walkthrough), 할 일 목록(Task.md) 및 AI 응답은 항상 한국어(Korean)로 작성합니다.**
* 코드 내 주석 및 커밋 메시지도 한국어로 작성합니다.

## 🛠️ 개발 규칙 및 지침
1. **바이브코딩(Vibe Coding) 워크플로우**:
   * 로컬 코드 변경 ➔ 로컬 테스트 ➔ Git Commit & Push ➔ Vercel 자동 배포의 흐름을 따릅니다.
2. **비밀키 관리**:
   * API 키, DB 비밀번호, 깃허브 토큰 등 모든 민감 정보는 `.env` 및 `secrets.local.md`에서만 읽고 절대 깃허브에 커밋되지 않도록 `.gitignore` 설정을 유지합니다.
3. **코드 스타일**:
   * React 19, CSS Variables 기반 스타일링을 유지하고, 기존의 미적 디자인(오렌지 컬러 `--primary: #FF6B35` 등)을 해치지 않으면서 완성도를 높입니다.
4. **검색 엔진 최적화(SEO)**:
   * 메타 태그, robots.txt, sitemap.xml을 최신 상태로 유지합니다.
