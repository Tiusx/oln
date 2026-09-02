import { useCallback, useEffect, useState } from 'react';
import { api, type ResourceItem } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

const PROVIDERS: { key: 'local' | 'r2' | 's3' | 'github'; label: string; desc: string }[] = [
  { key: 'r2', label: 'Cloudflare R2', desc: 'S3 对接（默认）' },
  { key: 's3', label: 'S3 兼容存储', desc: '通用 S3 API' },
  { key: 'github', label: 'GitHub', desc: 'GitHub 仓库路径' },
];

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIco({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

interface LightboxProps {
  item: ResourceItem;
  order: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCopy: (url: string) => void;
  onDelete: (key: string) => void;
}

function Lightbox({ item, order, total, onClose, onPrev, onNext, onCopy, onDelete }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="lightbox-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lightbox">
        <div className="lightbox-head">
          <span className="lightbox-title" title={item.key}>
            <FileIco size={18} />
            <span className="ellip">{item.name}</span>
            <span className="lightbox-pos">{order + 1} / {total}</span>
          </span>
          <div className="flex" style={{ gap: 8 }}>
            <button className="ghost" onClick={() => onCopy(item.url)}>复制链接</button>
            <button className="danger" onClick={() => onDelete(item.key)}>删除</button>
            <button className="ghost" onClick={onClose} aria-label="关闭">×</button>
        </div>
      </div>
        <div className="lightbox-body">
          {item.type === 'video' ? (
            <video src={item.url} controls autoPlay className="lightbox-media" />
          ) : item.type === 'image' ? (
            <img src={item.url} alt={item.name} className="lightbox-media" />
          ) : (
            <div className="lightbox-file">
              <FileIco size={64} />
              <span className="lightbox-line">{item.name}</span>
            </div>
          )}
        </div>
        <div className="lightbox-foot">
          <span className="ellip" title={item.url}>{item.url}</span>
          <span className="lightbox-size">| {formatSize(item.size)}</span>
        </div>
      </div>
      {total > 1 && (
        <>
          <button className="lightbox-nav prev" onClick={onPrev} aria-label="上一个">‹</button>
          <button className="lightbox-nav next" onClick={onNext} aria-label="下一个">›</button>
        </>
      )}
    </div>
  );
}

export default function Resources() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [provider, setProvider] = useState<'local' | 'r2' | 's3' | 'github'>('r2');
  const [listable, setListable] = useState(true);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [cols, setCols] = useState(3);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w < 640 ? 1 : w < 900 ? 2 : 3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Distribute items into bucket columns (flex column) so nothing gets torn.
  // Global index is preserved for the lightbox.
  const columns: { item: ResourceItem; index: number }[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push({ item, index: i }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listResources(provider);
      setItems(r.data || []);
      setListable(r.listable !== false);
      setNote(r.message || '');
      setActive(null);
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
      await api.deleteResource(key, provider);
      toast('资源已删除');
      setActive(null);
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }, [provider, load, confirm, toast]);

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => toast('链接已复制到剪贴板', 'info'));
  }, [toast]);

  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);

  const doUpload = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadedCount(0);
    try {
      for (let i = 0; i < files.length; i++) {
        await api.uploadMedia(files[i], provider);
        setUploadedCount(i + 1);
      }
      toast(`成功上传 ${files.length} 个文件`);
      setUploadFiles([]);
      load();
    } catch (e: any) {
      toast(e.message || `上传失败，已完成 ${uploadedCount}/${files.length}`, 'error');
    } finally {
      setUploading(false);
    }
  }, [load, toast, uploadedCount, provider]);

  const onPick = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploadFiles((prev) => [...prev, ...Array.from(files)]);
  }, []);

  const prev = useCallback(() => {
    setActive((cur) => (cur === null ? null : (cur - 1 + items.length) % items.length));
  }, [items.length]);

  const next = useCallback(() => {
    setActive((cur) => (cur === null ? null : (cur + 1) % items.length));
  }, [items.length]);

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

      {provider !== 'github' && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 className="panel-title" style={{ margin: '0 0 12px' }}>上传到 {PROVIDERS.find((p) => p.key === provider)?.label}</h3>
          <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label className="btn" style={{ cursor: 'pointer' }} aria-label="选择文件">
              选择文件
              <input type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
            </label>
            {uploadFiles.length > 0 && (
              <>
                <button className="btn" onClick={() => doUpload(uploadFiles)} disabled={uploading}>
                  {uploading ? <><span className="spinner-sm" /> 上传中… {uploadedCount}/{uploadFiles.length}</> : `开始上传 (${uploadFiles.length})`}
                </button>
                <button className="secondary" onClick={() => setUploadFiles([])} disabled={uploading}>清空</button>
              </>
            )}
            {uploadFiles.length === 0 && !uploading && (
              <span className="muted" style={{ alignSelf: 'center' }}>支持图片 / 视频 / PDF，单文件 ≤ 20MB，文件将存入 medias/ 前缀。</span>
            )}
          </div>
          {uploadFiles.length > 0 && !uploading && (
            <ul className="upload-list">
              {uploadFiles.map((f, i) => (
                <li key={`${f.name}-${i}`}><span>{f.name}</span> <span className="muted">({formatSize(f.size)})</span></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {provider === 'github' && (
        <p className="muted" style={{ marginBottom: 12 }}>当前提供商（GitHub）仅支持浏览、删除与复制链接，上传暂未接入。</p>
      )}

      {loading && <p className="muted flex"><span className="spinner" /> 加载中…</p>}

      {!loading && !listable && (
        <div className="panel" style={{ marginBottom: 16, padding: 16 }}>
          <p className="muted" style={{ margin: 0 }}>{note || '该存储当前不可用。请检查「存储配置」或切换到本地存储。'}</p>
        </div>
      )}

      {!loading && listable && (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>共 {items.length} 个资源 · 点击缩略图可放大预览，悬停可复制链接或删除。</p>
          {items.length === 0 ? (
            <div className="state-box">暂无资源。请使用上方「上传到本地存储」上传文件，或在「存储配置」对接 R2 / GitHub。</div>
          ) : (
            <div className="resource-masonry">
              {columns.map((col, colIdx) => (
                <div className="resource-masonry-col" key={colIdx}>
                  {col.map(({ item: it, index }) => (
                    <div key={it.key} className="resource-card">
                      {it.type === 'image' ? (
                        <button className="res-thumb img" onClick={() => setActive(index)} aria-label={`放大查看 ${it.name}`}>
                          <img src={it.url} alt={it.name} loading="lazy" />
                        </button>
                      ) : it.type === 'video' ? (
                        <button className="res-thumb vid" onClick={() => setActive(index)} aria-label={`预览 ${it.name}`}>
                          <video src={it.url} preload="metadata" muted playsInline />
                          <span className="res-play">▶</span>
                        </button>
                      ) : (
                        <button className="res-thumb file" onClick={() => setActive(index)} aria-label={`查看 ${it.name}`}>
                          <FileIco />
                        </button>
                      )}
                      <div className="res-meta">
                        <div className="res-name" title={it.key}>{it.name}</div>
                        <div className="res-foot">
                          <span className="res-size">{formatSize(it.size)}</span>
                          <span className="res-actions">
                            <button className="ghost" title="复制链接" onClick={() => copyUrl(it.url)}>复制链接</button>
                            <button className="ghost danger-text" title="删除" onClick={() => remove(it.key)}>删除</button>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {active !== null && items[active] && (
        <Lightbox
          item={items[active]}
          order={active}
          total={items.length}
          onClose={() => setActive(null)}
          onPrev={prev}
          onNext={next}
          onCopy={copyUrl}
          onDelete={remove}
        />
      )}
    </div>
  );
}
