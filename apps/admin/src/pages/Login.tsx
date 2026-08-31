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
    if (!ident.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api.login(ident, password);
      onLogin(r.data);
    } catch (err: any) {
      const msg = err?.message || '登录失败';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit} noValidate>
        <div className="login-brand">
          <div className="login-logo">O</div>
          <h1 className="login-title">oln 后台管理</h1>
          <p className="login-sub">登录以管理博客内容</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="login-field">
          <label htmlFor="login-ident">用户名 / 邮箱</label>
          <div className="login-input-wrap">
            <svg className="login-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input
              id="login-ident"
              type="text"
              value={ident}
              onChange={(e) => setIdent(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="请输入用户名或邮箱"
            />
          </div>
        </div>

        <div className="login-field">
          <label htmlFor="login-pass">密码</label>
          <div className="login-input-wrap">
            <svg className="login-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="请输入密码"
            />
          </div>
        </div>

        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? (
            <>
              <span className="login-spinner" />
              登录中...
            </>
          ) : (
            '登 录'
          )}
        </button>

        <p className="login-foot">欢迎回来，请登录你的账号</p>
      </form>
    </div>
  );
}
