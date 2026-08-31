import { useCallback, useEffect, useState } from 'react';
import { api, type ResourceItem } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

const PROVIDERS: { key: 'local' | 'r2' | 'github'; label: string; desc: string }[] = [
  { key: 'local', label: '本地存储', desc: 'Cloudflare R2 (MEDIA)' },
  { key: 'r2', label: 'Cloudflare R2', desc: '第三方 R2' },
  { key: 'github', label: 'GitHub', desc: 'GitHub Pages' },
];

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Resources() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [provider, setProvider] = useState<'local' | 'r2' | 'github'>('local');
  const [listable, setListable] = useState(true);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listResources(provider);
      setItems(r.data || []);
      setListable(r.listable !== false);
      setNote(r.message || '');
    } catch (e: any) {
      toast(e.message || '获取资源失败', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [provider, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (key: string) => {
    if (!(await confirm({ title: '删除资源', message: `确定删除 "${key}" 吗？此操作无法撤销。`, danger: true }))) return;
    try {
      await api.deleteResource(key);
      toast('资源已删除');
      setItems((prev) => prev.filter((i) => i.key !== key));
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }, [load, confirm, toast]);

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => toast('URL 已复制到剪贴板', 'info'));
  }, [toast]);

  return (
    <div>
      <h1 className="page-title">资源库</h1>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="provider-nav" role="tablist" aria-label="存储提供商">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={provider === p.key}
              className={`provider-tab ${provider === p.key ? 'active' : ''}`}
              onClick={() => setProvider(p.key)}
            >
              <span className="provider-name">{p.label}</span>
              <span className="provider-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted flex"><span className="spinner" /> 加载中…</p>}

      {!loading && !listable && (
        <div className="panel" style={{ marginBottom: 16, padding: 16 }}>
          <p className="muted" style={{ margin: 0 }}>{note || '该存储仅保存了配置，暂不支持实时浏览。请切换到本地存储.'}</p>
        </div>
      )}

      {!loading && listable && (
        <div className="resource-grid">
          {items.map((it) => (
            <div key={it.key} className="resource-item">
              {it.type === 'image' ? (
                <img src={it.url} alt={it.name} loading="lazy" />
              ) : it.type === 'video' ? (
                <video src={it.url} preload="metadata" controls />
              ) : (
                <div className="resource-file-ico">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
              )}
              <div className="meta" title={it.key}>{it.name}</div>
              <div className="resource-size">{formatSize(it.size)}</div>
              <div className="flex" style={{ padding: '0 6px 6px' }}>
                <button className="ghost" onClick={() => copyUrl(it.url)}>复制URL</button>
                <button className="danger" onClick={() => remove(it.key)}>删除</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="state-box" style={{ gridColumn: '1 / -1' }}>暂无资源，请先到"媒体库"上传文件，或配置存储。</div>}
        </div>
      )}
    </div>
  );
}
