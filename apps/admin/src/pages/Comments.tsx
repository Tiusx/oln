import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

type Settings = any;

const PROVIDERS = [
  { value: 'self', label: '不启用（无）' },
  { value: 'giscus', label: 'giscus（GitHub 讨论）' },
  { value: 'utterances', label: 'utterances（GitHub Issues）' },
  { value: 'waline', label: 'Waline（自托管 / 第三方）' },
];

export default function Comments() {
  const [config, setConfig] = useState<Settings | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const r = await api.getConfig();
    setConfig(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!config) return <p className="muted">加载中...</p>;

  const c = config.features.comments;
  const setC = (fn: (prev: any) => any) =>
    setConfig((p: any) => ({ ...p, features: { ...p.features, comments: fn(p.features.comments) } }));

  async function save() {
    try {
      await api.saveConfig(config);
      toast('评论配置已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">评论系统</h1>
        <button onClick={save}>保存配置</button>
      </div>

      <div className="panel">
        <Check label="启用评论" checked={c.enabled} onChange={(v) => setC((p) => ({ ...p, enabled: v }))} />

        <label>评论供应商</label>
        <select value={c.provider} onChange={(e) => setC((p) => ({ ...p, provider: e.target.value }))}>
          {PROVIDERS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          {PROVIDERS.find((p) => p.value === c.provider)?.label} 所需参数将在下方显示。
        </p>

        {c.provider === 'giscus' && (
          <>
            <h3 style={{ margin: '16px 0 8px' }}>giscus 集成参数</h3>
            <Field label="GitHub 仓库（owner/repo）" value={c.giscusRepo} onChange={(v) => setC((p) => ({ ...p, giscusRepo: v }))} />
            <Field label="Repository ID" value={c.giscusRepoId} onChange={(v) => setC((p) => ({ ...p, giscusRepoId: v }))} />
            <Field label="Discussion Category" value={c.giscusCategory} onChange={(v) => setC((p) => ({ ...p, giscusCategory: v }))} />
            <Field label="Discussion Category ID" value={c.giscusCategoryId} onChange={(v) => setC((p) => ({ ...p, giscusCategoryId: v }))} />
          </>
        )}

        {c.provider === 'utterances' && (
          <>
            <h3 style={{ margin: '16px 0 8px' }}>utterances 集成参数</h3>
            <Field label="GitHub 仓库（owner/repo）" value={c.utterancesRepo} onChange={(v) => setC((p) => ({ ...p, utterancesRepo: v }))} />
          </>
        )}

        {c.provider === 'waline' && (
          <>
            <h3 style={{ margin: '16px 0 8px' }}>Waline 集成参数</h3>
            <Field label="Waline 服务端地址" value={c.walineServerURL} onChange={(v) => setC((p) => ({ ...p, walineServerURL: v }))} />
            <div className="form-actions" style={{ marginTop: 16 }}>
              <a className="btn" href="https://waline.tius.cn/ui/" target="_blank" rel="noopener noreferrer">
                打开评论管理面板 ↗
              </a>
            </div>
          </>
        )}

        {c.provider === 'self' && (
          <p className="muted" style={{ marginTop: 8 }}>已选择"无"：当前不展示第三方评论系统，仅保留自建评论（未启用）。</p>
        )}

        <h3 style={{ margin: '20px 0 8px' }}>其他</h3>
        <Check label="评论需审核（Waline）" checked={c.audit} onChange={(v) => setC((p) => ({ ...p, audit: v }))} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label>{label}</label>
      <input type="text" className="field-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0', fontWeight: 400 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 'auto' }} />
      {label}
    </label>
  );
}
