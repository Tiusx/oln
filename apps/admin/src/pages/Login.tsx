import { useState } from 'react';
import { api, type User } from '../api/client';
import { useToast } from '../ui/Feedback';

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [ident, setIdent] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.login(ident, password);
      onLogin(r.data);
    } catch (err: any) {
      setError(err.message);
      toast(err.message || '登录失败', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h1>登录后台</h1>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <label>用户名 / 邮箱</label>
        <input type="text" value={ident} onChange={(e) => setIdent(e.target.value)} autoFocus />
        <label>密码</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="form-actions">
          <button type="submit" disabled={busy}>{busy ? '登录中...' : '登录'}</button>
        </div>
      </form>
    </div>
  );
}
