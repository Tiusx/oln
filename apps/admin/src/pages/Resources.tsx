import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

interface ResourceItem {
  key: string;
  name: string;
  url: string;
  size: number;
  type: 'image' | 'video' | 'other';
  provider: 'local' | 'r2' | 'github';
}

export default function Resources() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [provider, setProvider] = useState<'local' | 'r2' | 'github'>('local');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listResources(provider);
      setItems(r.data);
    } catch (e: any) {
      toast(e.message || '获取资源失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (key: string) => {
    if (!(await confirm({ title: '删除资源', message: '确定删除此资源吗？', danger: true }))) return;
    try {
      await api.deleteResource(key);
      toast('资源已删除');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }, []);

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => toast('URL 已复制到剪贴板', 'info'));
  }, []);

  return (
    <div>
      <h1 className="page-title">资源库</h1>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>筛选存储</h3>
        <div className="flex">
          <label className="ghost" onClick={() => setProvider('local')}>本地</label>
          <label className="ghost" onClick={() => setProvider('r2')}>Cloudflare R2</label>
          <label className="ghost" onClick={() => setProvider('github')}>GitHub</label>
        </div>
      </div>

      {loading && <p className="muted flex"><span className="spinner" /> 加载中…</p>}

      <div className="resource-grid">
        {items.map((it) => (
          <div key={it.key} className="resource-item">
{it.type === 'image' ? (
              <img src={it.url} alt={it.name} style={{ width: 80, height: 80, objectFit: 'cover' }} />
            ) : it.type === 'video' ? (
              <video src={it.url} controls style={{ width: 80, height: 80 }} />
            ) : (
              <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#64748b' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
            )}
            <div className="meta" title={it.name}>{it.name}</div>
            <div className="flex" style={{ padding: '0 6px 6px' }}>
              <button className="ghost" onClick={() => copyUrl(it.url)}>复制URL</button>
              <button className="danger" onClick={() => remove(it.key)}>删除</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && <div className="state-box" style={{ gridColumn: '1 / -1' }}>暂无资源，请先配置存储并上传文件。</div>}
      </div>
    </div>
  );
}

function confirm(args: { title: string; message: string; danger?: boolean }) {
  // Mock confirm - in real app this would use a modal
  return Promise.resolve(true);
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label>{label}</label>
      <input type="text" className="field-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}