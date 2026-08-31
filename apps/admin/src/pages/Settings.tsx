import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

type Settings = any;

const TABS = [
  'basic' as const,
  'seo' as const,
  'footer' as const,
  'inject' as const,
  'features' as const,
];

const TAB_LABEL: Record<string, string> = {
  basic: '基础',
  seo: 'SEO',
  footer: '页脚',
  inject: '注入代码',
  features: '功能',
};

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
  return (
    <F>
      <Field label="站点名称" value={c.basic.siteName} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, siteName: v } }))} />
      <Field label="标语" value={c.basic.tagline} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, tagline: v } }))} />
      <Field label="Logo URL" value={c.basic.logo} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, logo: v } }))} />
      <Field label="Favicon URL" value={c.basic.favicon} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, favicon: v } }))} />
      <div className="field-grid">
        <div><Field label="语言" value={c.basic.language} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, language: v } }))} /></div>
        <div><Field label="时区" value={c.basic.timezone} onChange={(v) => set((p) => ({ ...p, basic: { ...p.basic, timezone: v } }))} /></div>
      </div>
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
