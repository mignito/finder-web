import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요'); return; }

    setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) setError('이메일 인증이 필요해요. 받은편지함을 확인해주세요.');
        else setError('이메일 또는 비밀번호가 올바르지 않아요 (' + error.message + ')');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        alert('회원가입 완료! 이제 로그인해주세요.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <Logo size={64} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4, margin: '8px 0 4px' }}>FINDER</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>마음을 모아 함께 찾는 실종자 플랫폼</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>이메일</label>
            <input
              className="input"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>비밀번호</label>
            <input
              className="input"
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: '#FF3B30', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
