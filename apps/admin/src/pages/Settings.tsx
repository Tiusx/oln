import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

type Settings = any;

const TABS = [
  'basic' as const,
  'theme' as const,
  'seo' as const,
  'footer' as const,
  'inject' as const,
  'features' as const,
];

const TAB_LABEL: Record<string, string> = {
  basic: '基础',
  theme: '主题',
  seo: 'SEO',
  footer: '页脚',
  inject: '注入代码',
  features: '功能',
};

const THEMES = [
  { id: 'default', name: '极简', accent: '#1f2328', soft: '#eef1f4', light: '#ffffff', dark: '#1e1e20' },
  { id: 'ocean', name: '海洋', accent: '#0f6fc4', soft: '#e0edf9', light: '#f5f8fc', dark: '#0e1724' },
  { id: 'forest', name: '森林', accent: '#2f7d3a', soft: '#e6efd8', light: '#fafbf7', dark: '#141a11' },
  { id: 'sunset', name: '晚霞', accent: '#b45518', soft: '#f6e6d2', light: '#fdf7f1', dark: '#211409' },
  { id: 'midnight', name: '午夜', accent: '#4b4fc7', soft: '#e3e4f5', light: '#f4f5fb', dark: '#12121f' },
];

export default function Settings() {
  const [config, setConfig] = useState<Settings | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('basic');
  const { toast } = useToast();

  const load = useCallback(async () => {
    const r = await api.getConfig();
    setConfig(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      const r = await api.saveConfig(config);
      setConfig(r.data);
      toast('设置已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  if (!config) return <p className="muted">加载中...</p>;

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">站点设置</h1>
        <button onClick={save}>保存设置</button>
      </div>

      <div className="settings-nav">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="panel">
        {tab === 'basic' && <Basic set={setConfig} c={config} />}
        {tab === 'theme' && <Theme set={setConfig} c={config} />}
        {tab === 'seo' && <Seo set={setConfig} c={config} />}
        {tab === 'footer' && <Footer set={setConfig} c={config} />}
        {tab === 'inject' && <Inject set={setConfig} c={config} />}
        {tab === 'features' && <Features set={setConfig} c={config} />}
      </div>
    </div>
  );
}

type SetFn = (fn: (prev: Settings) => Settings) => void;

function F({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Basic({ set, c }: { set: SetFn; c: Settings }) {
  const wrapSelection = (prefix: string, suffix: string) => {
    const ta = document.querySelector('.bio-textarea') as HTMLTextAreaElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = (c.basic.bio || '').slice(start, end);
    const text = prefix + selected + suffix;
    const newValue = (c.basic.bio || '').slice(0, start) + text + (c.basic.bio || '').slice(end);
    set((p: any) => ({ ...p, basic: { ...p.basic, bio: newValue } }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = end + prefix.length + (selected ? suffix.length : 0);
    });
  };

  return (
    <F>
      <Field label="站点名称" value={c.basic.siteName} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, siteName: v } }))} />
      <Field label="Logo URL" value={c.basic.logo} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, logo: v } }))} />
      <Field label="Favicon URL" value={c.basic.favicon} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, favicon: v } }))} />
      <div className="field-grid">
        <div><Field label="语言" value={c.basic.language} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, language: v } }))} /></div>
        <div><Field label="时区" value={c.basic.timezone} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, timezone: v } }))} /></div>
      </div>
      <label className="field-label">简介（支持 Markdown）</label>
      <div className="md-toolbar">
        <button type="button" onClick={() => wrapSelection('**', '**')} title="粗体">B</button>
        <button type="button" onClick={() => wrapSelection('*', '*')} title="斜体">I</button>
        <button type="button" onClick={() => wrapSelection('~~', '~~')} title="删除线">S</button>
        <button type="button" onClick={() => wrapSelection('`', '`')} title="行内代码"><code>{'{}'}</code></button>
        <span className="md-toolbar-sep" />
        <button type="button" onClick={() => wrapSelection('# ', '')} title="H1">H1</button>
        <button type="button" onClick={() => wrapSelection('## ', '')} title="H2">H2</button>
        <button type="button" onClick={() => wrapSelection('### ', '')} title="H3">H3</button>
        <span className="md-toolbar-sep" />
        <button type="button" onClick={() => wrapSelection('[', '](url)')} title="链接">链接</button>
        <button type="button" onClick={() => wrapSelection('![', '](url)')} title="图片">图片</button>
        <span className="md-toolbar-sep" />
        <button type="button" onClick={() => wrapSelection('- ', '')} title="无序列表">• 列表</button>
        <button type="button" onClick={() => wrapSelection('1. ', '')} title="有序列表">1. 列表</button>
        <button type="button" onClick={() => wrapSelection('> ', '')} title="引用">引用</button>
        <span className="md-toolbar-sep" />
        <button type="button" onClick={() => wrapSelection('```\n', '\n```\n')} title="代码块">代码块</button>
        <button type="button" onClick={() => wrapSelection('---\n', '')} title="分隔线">—</button>
        <button type="button" onClick={() => wrapSelection('- [ ] ', '')} title="任务列表">☐ 任务</button>
      </div>
      <textarea
        className="field-input bio-textarea"
        style={{ minHeight: 120, fontFamily: 'var(--mono)', fontSize: 13, resize: 'vertical', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        placeholder="支持 Markdown 格式的站点简介，将在首页显示"
        value={c.basic.bio || ''}
        onChange={(e) => set((p) => ({ ...p, basic: { ...p.basic, bio: e.target.value } }))}
      />
    </F>
  );
}

function Seo({ set, c }: { set: SetFn; c: Settings }) {
  return (
    <F>
      <Field label="站点描述" value={c.seo.description} onChange={(v) => set((p) => ({ ...p, seo: { ...p.seo, description: v } }))} />
      <Field label="关键词" value={c.seo.keywords} onChange={(v) => set((p) => ({ ...p, seo: { ...p.seo, keywords: v } }))} />
      <Field label="OG 图片 URL" value={c.seo.ogImage} onChange={(v) => set((p) => ({ ...p, seo: { ...p.seo, ogImage: v } }))} />
      <Check label="启用 sitemap" checked={c.seo.enableSitemap} onChange={(v) => set((p) => ({ ...p, seo: { ...p.seo, enableSitemap: v } }))} />
      <Check label="启用 robots.txt" checked={c.seo.enableRobots} onChange={(v) => set((p) => ({ ...p, seo: { ...p.seo, enableRobots: v } }))} />
    </F>
  );
}



function Footer({ set, c }: { set: SetFn; c: Settings }) {
  return (
    <F>
      <Field label="页脚文字" value={c.footer.footerText} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, footerText: v } }))} />
      <Field label="备案号" value={c.footer.beian} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, beian: v } }))} />
    </F>
  );
}

function Inject({ set, c }: { set: SetFn; c: Settings }) {
  return (
    <F>
      <label className="field-label">head 注入 HTML</label>
      <textarea className="field-input" style={{ fontFamily: 'var(--mono)', fontSize: 13 }} value={c.inject.headHtml || ''} onChange={(e) => set((p) => ({ ...p, inject: { ...p.inject, headHtml: e.target.value } }))} />
      <label className="field-label" style={{ marginTop: 16 }}>脚部注入 HTML</label>
      <textarea className="field-input" style={{ fontFamily: 'var(--mono)', fontSize: 13 }} value={c.inject.footHtml || ''} onChange={(e) => set((p) => ({ ...p, inject: { ...p.inject, footHtml: e.target.value } }))} />
    </F>
  );
}

function Theme({ set, c }: { set: SetFn; c: Settings }) {
  const theme = c.theme || { active: 'default', allowToggle: true, preferred: 'system' };
  const setTheme = (patch: Record<string, unknown>) =>
    set((p) => ({ ...p, theme: { ...(p.theme || { active: 'default', allowToggle: true, preferred: 'system' }), ...patch } }));

  return (
    <F>
      <h3 style={{ margin: '0 0 10px' }}>站点主题</h3>
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 14 }}>
        选择前台博客的整体视觉主题（配色方案），保存后所有访客都会看到该主题。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {THEMES.map((t) => {
          const active = (theme.active || 'default') === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme({ active: t.id })}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: 0,
                border: active ? `2px solid ${t.accent}` : '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: active ? '0 2px 10px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <div style={{ height: 54, background: `linear-gradient(135deg, ${t.light} 0%, ${t.light} 100%)`, display: 'flex', gap: 6, alignItems: 'flex-start', padding: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.accent, marginTop: 3 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.dark }}>{t.name}</span>
              </div>
              <div style={{ height: 26, background: t.soft, display: 'flex', gap: 5, alignItems: 'center', padding: '0 10px' }}>
                {[t.accent, t.dark, '#98a2b3'].map((col, i) => (
                  <span key={i} style={{ width: 14, height: 7, borderRadius: 3, background: col, opacity: i === 2 ? 0.5 : 1 }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

      <Check
        label="允许访客切换明暗模式（显示头部切换按钮）"
        checked={theme.allowToggle !== false}
        onChange={(v) => setTheme({ allowToggle: v })}
      />

      <div style={{ marginTop: 16 }}>
        <label className="field-label">默认模式（无访客偏好时使用）</label>
        <select
          className="field-input"
          value={theme.preferred || 'system'}
          onChange={(e) => setTheme({ preferred: e.target.value })}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
    </F>
  );
}

function Features({ set, c }: { set: SetFn; c: Settings }) {
  return (
    <F>
      <h3 style={{ margin: '0 0 8px' }}>邮件订阅</h3>
      <Check label="启用订阅" checked={c.features.newsletter.enabled} onChange={(v) => set((p) => ({ ...p, features: { ...p.features, newsletter: { ...p.features.newsletter, enabled: v } } }))} />

      <h3 style={{ margin: '20px 0 8px' }}>统计</h3>
      <Check label="启用统计" checked={c.features.analytics.enabled} onChange={(v) => set((p) => ({ ...p, features: { ...p.features, analytics: { ...p.features.analytics, enabled: v } } }))} />
      <Field label="Web Analytics Token" value={c.features.analytics.webAnalyticsToken} onChange={(v) => set((p) => ({ ...p, features: { ...p.features, analytics: { ...p.features.analytics, webAnalyticsToken: v } } }))} />
    </F>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input type="text" className="field-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch" style={{ margin: '8px 0' }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </>
  );
}
