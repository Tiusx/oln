import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api/client';
import type { User } from './api/client';
import { ToastProvider, ConfirmProvider } from './ui/Feedback';
import ChangePasswordModal from './ui/ChangePasswordModal';
import Login from './pages/Login';
import Posts from './pages/Posts';
import PostEditor from './pages/PostEditor';
import Taxonomy from './pages/Taxonomy';
import PagesPage from './pages/PagesPage';
import Links from './pages/Links';
import Subscribers from './pages/Subscribers';
import Settings from './pages/Settings';
import Comments from './pages/Comments';
import Navigation from './pages/Navigation';
import Author from './pages/Author';
import Storage from './pages/Storage';
import Resources from './pages/Resources';
import Moments from './pages/Moments';

interface AuthCtx {                     // ★ 先定义接口
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthCtx>({  // ★ 再创建 Context
  user: null,
  loading: true,
  setUser: () => {},
});
export const useAuth = () => useContext(AuthContext);

export default function App() {
   const [user, setUser] = useState<User | null>(null);   // ★ 显式指定 User | null
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.me().then((r: any) => { if (r && r.data) setUser(r.data); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (<ToastProvider><ConfirmProvider><div className="login-wrap">加载中...</div></ConfirmProvider></ToastProvider>);
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        {!user ? (
          <AuthContext.Provider value={{ user, loading, setUser }}>
            <Login onLogin={(u) => { setUser(u); }} />
          </AuthContext.Provider>
        ) : (
          <AuthContext.Provider value={{ user, loading, setUser }}>
            <header className="mobile-header">
              <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(true)} aria-label="打开菜单">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <strong style={{fontSize:16}}>管理后台</strong>
              <span style={{width:40}}/>
            </header>
            <div className="layout">
              <Sidebar onLogout={() => { setUser(null); }} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
              )}
              <main className="main">
                <Routes>
                  <Route path="/" element={<Posts />} />
                  <Route path="/posts/new" element={<PostEditor />} />
                  <Route path="/posts/:id" element={<PostEditor />} />
                  <Route path="/taxonomy" element={<Taxonomy />} />
                  <Route path="/pages" element={<PagesPage />} />
                  <Route path="/moments" element={<Moments />} />
                  <Route path="/links" element={<Links />} />
                  <Route path="/subscribers" element={<Subscribers />} />
                  <Route path="/storage" element={<Storage />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/comments" element={<Comments />} />
                  <Route path="/navigation" element={<Navigation />} />
                  <Route path="/author" element={<Author />} />
                </Routes>
              </main>
            </div>
          </AuthContext.Provider>
        )}
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Sidebar({ onLogout, open, onClose }: { onLogout: () => void; open: boolean; onClose: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const groups = [
    {
      title: '内容',
      items: [
        { to: '/', label: '文章管理', icon: 'M4 5h3v3H4zM4 10h3v3H4zM4 15h3v3H4zM10 5h10v2H10zM10 10h10v2H10zM10 15h10v2H10z' },
        { to: '/taxonomy', label: '分类 / 标签', icon: 'M3 5h7l2 2h9v10H3z' },
        { to: '/moments', label: '动态（朋友圈）', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm4.5 12.5a1 1 0 01-1 1H9.2a1 1 0 01-.8-1.6l2.2-3V9a1 1 0 010-2h1a1 1 0 011 1v2l2.2 3a1 1 0 011.4.3z' },
      ],
    },
    {
      title: '扩展',
      items: [
        { to: '/links', label: '友链', icon: 'M10 14a5 5 0 007 0l1-1a5 5 0 10-8-8l-.7.7M14 10a5 5 0 00-7 0l-1 1a5 5 0 108 8l.7-.7' },
        { to: '/subscribers', label: '订阅者（邮件）', icon: 'M4 4h8v12H4z' },
      ],
    },
    {
      title: '资源管理',   
      items: [            
        { to: '/storage', label: '存储配置', icon: 'M12 6v6l4 4' },
        { to: '/resources', label: '资源库', icon: 'M12 6v6l4 4' },
      ],
    },
    {
      title: '评论系统',
      items: [
        { to: '/comments', label: '评论设置', icon: 'M12 3a9 9 0 00-9 9c0 1.6.4 3.1 1.1 4.4L3 21l4.6-1.1A9 9 0 1012 3z' },
      ],
    },
    {
      title: '系统',
      items: [
        { to: '/settings', label: '站点设置', icon: 'M12 2l1 3h2l3-1 1 3 3 1-1 3v2l1 3-3 1-1 3-3-1h-2l-1 3-3-1-1-3-3-1 1-3v-2l-1-3 3-1 1-3z M12 9a3 3 0 100 6 3 3 0 000-6z' },
      ],
    },
    {
      title: '作者中心',
      items: [
        { to: '/author', label: '个人中心', icon: 'M12 2l1 3h2l3-1 1 3 3 1-1 3v2l1 3-3 1-1 3-3-1h-2l-1 3-3-1-1-3-3-1 1-3v-2l-1-3 3-1 1-3z M12 9a3 3 0 100 6 3 3 0 000-6z' },
      ],
    },
    {
      title: '导航菜单',
      items: [
        { to: '/navigation', label: '导航菜单', icon: 'M10 14a5 5 0 007 0l1-1a5 5 0 10-8-8l-.7.7M14 10a5 5 0 00-7 0l-1 1a5 5 0 108 8l.7-.7' },
        { to: '/pages', label: '页面', icon: 'M4 6h16v3H4zM4 11h16v3H4zM4 16h9v2H4z' },
      ],
    },
  ];

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <span className="logo-dot">B</span>
        管理后台
        <button className="sidebar-close" onClick={onClose} aria-label="关闭菜单">×</button>
      </div>
<nav>
        {groups.map((g, gi) => (
          <div className="nav-group" key={gi}>
            {g.title && <div className="nav-group-title">{g.title}</div>}
            {g.items.map((l, li) => (
              <NavLink key={`${gi}-${li}`} to={l.to as string} end={l.to === '/'} onClick={onClose}>
                <span className="nav-ico">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={l.icon} />
                  </svg>
                </span>
                {l.label}
              </NavLink>
            ))}
            {g.items.length > 0 && <div className="nav-divider" />}
          </div>
        ))}
        <button className="nav-logout" onClick={() => setShowPw(true)}>修改密码</button>
        <button className="nav-logout" onClick={onLogout}>退出登录</button>
      </nav>
      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
    </aside>
  );
}