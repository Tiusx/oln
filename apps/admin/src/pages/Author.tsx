import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

type Settings = any;

export default function Author() {
  const [config, setConfig] = useState<Settings | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const r = await api.getConfig();
    setConfig(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!config) return <p className="muted">加载中...</p>;

  const author = config.author || { name: '', avatar: '', bio: '', socials: [] };
  const setAuthor = (fn: (a: any) => any) => setConfig((p: any) => ({ ...p, author: fn(p.author || {}) }));

  async function save() {
    try {
      await api.saveConfig(config);
      toast('作者信息已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  function addSocial() {
    setAuthor(a => ({ ...a, socials: [...(a.socials || []), { label: '', url: '' }] }));
  }
  function removeSocial(i: number) {
    setAuthor(a => ({ ...a, socials: (a.socials || []).filter((_: any, idx: number) => idx !== i) }));
  }
  function updateSocial(i: number, patch: any) {
    setAuthor(a => ({ ...a, socials: (a.socials || []).map((s: any, idx: number) => idx === i ? { ...s, ...patch } : s) }));
  }

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">作者中心</h1>
        <button onClick={save}>保存配置</button>
      </div>

      <div className="panel">
        <h3 style={{ margin: '0 0 10px' }}>基本信息</h3>
        <div className="row">
          <div style={{ flex: 1 }}><label>作者名</label><input className="field-input" value={author.name} onChange={(e) => setAuthor(a => ({ ...a, name: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label>头像 URL</label><input className="field-input" value={author.avatar} onChange={(e) => setAuthor(a => ({ ...a, avatar: e.target.value }))} /></div>
        </div>
        <label style={{ display: 'block', marginTop: 12 }}>简介</label>
        <textarea className="field-input" value={author.bio} onChange={(e) => setAuthor(a => ({ ...a, bio: e.target.value }))} rows={4} style={{ marginTop: 4 }} />
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ margin: '0 0 10px' }}>社交链接</h3>
        {(author.socials || []).map((s: any, i: number) => (
          <div key={i} className="flex" style={{ marginBottom: 8 }}>
            <input type="text" className="field-input" value={s.label} placeholder="平台" style={{ width: 140 }} onChange={(e) => updateSocial(i, { label: e.target.value })} />
            <input type="text" className="field-input" value={s.url} placeholder="URL" onChange={(e) => updateSocial(i, { url: e.target.value })} />
            <button className="danger" onClick={() => removeSocial(i)}>×</button>
          </div>
        ))}
        <button className="secondary" onClick={addSocial}>+ 添加社交链接</button>
      </div>
    </div>
  );
}