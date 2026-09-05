import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ResourceItem } from '../api/client';
import { useToast } from './Feedback';

const PROVIDERS: { key: 'local' | 'r2' | 's3' | 'github'; label: string; desc: string }[] = [
  { key: 'local', label: '本地存储', desc: '服务器磁盘（默认）' },
  { key: 'r2', label: 'Cloudflare R2', desc: 'S3 对接' },
  { key: 's3', label: 'S3 兼容存储', desc: '通用 S3 API' },
  { key: 'github', label: 'GitHub', desc: 'GitHub 仓库路径' },
];

const MEM_KEY = 'oln.respicker.provider';

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface ResourcePickerProps {
  mode: 'image' | 'link';
  onSelect: (item: ResourceItem) => void;
  onClose: () => void;
}

export default function ResourcePicker({ mode, onSelect, onClose }: ResourcePickerProps) {
  const [provider, setProvider] = useState<'local' | 'r2' | 's3' | 'github'>(
    () => {
      const saved = localStorage.getItem(MEM_KEY) as 'local' | 'r2' | 's3' | 'github' | null;
      return saved && PROVIDERS.some((p) => p.key === saved) ? saved : 'local';
    },
  );
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listable, setListable] = useState(true);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listResources(provider);
      setItems(r.data || []);
      setListable(r.listable !== false);
      setNote(r.message || '');
      setSelected((cur) => (cur && r.data?.some((it) => it.key === cur.key) ? cur : null));
    } catch (e: any) {
      toast(e.message || '获取资源失败', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [provider, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickProvider = (p: 'local' | 'r2' | 's3' | 'github') => {
    setProvider(p);
    setSelected(null);
    try { localStorage.setItem(MEM_KEY, p); } catch { /* ignore */ }
  };

  const visible = mode === 'image' ? items.filter((it) => it.type === 'image') : items;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const toUpload = Array.from(files);
    let done = 0;
    setUploading(true);
    setUploadedCount(0);
    try {
      for (let i = 0; i < toUpload.length; i++) {
        await api.uploadMedia(toUpload[i], provider);
        done = i + 1;
        setUploadedCount(done);
      }
      toast(`成功上传 ${toUpload.length} 个文件`);
      await load();
    } catch (e: any) {
      toast(`上传失败：${e.message || e}（已上传 ${done}/${toUpload.length}）`, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function insert() {
    if (selected) onSelect(selected);
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal res-picker" role="dialog" aria-modal="true" aria-label={mode === 'image' ? '插入图片' : '插入链接'}>
        <div className="modal-head">
          <span>{mode === 'image' ? '插入图片' : '插入链接'} · 资源库</span>
          <button className="ghost" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="modal-body res-picker-body">
          <div className="provider-nav" role="tablist" aria-label="存储提供商">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={provider === p.key}
                className={`provider-tab ${provider === p.key ? 'active' : ''}`}
                onClick={() => pickProvider(p.key)}
              >
                <span className="provider-name">{p.label}</span>
                <span className="provider-desc">{p.desc}</span>
              </button>
            ))}
          </div>

          <div className="res-picker-head">
            <span className="muted" style={{ fontSize: 12.5 }}>{mode === 'image' ? '选择图片插入文章' : '选择资源插入链接'}（双击直接插入）</span>
            {provider !== 'github' && (
              <div className="res-picker-upload">
                <button className="btn sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <><span className="spinner-sm" /> 上传中… {uploadedCount}</> : '上传文件'}
                </button>
                {uploading && (
                  <span className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>
                    正在上传到 {PROVIDERS.find((p) => p.key === provider)?.label}…
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  accept={mode === 'image' ? 'image/*' : undefined}
                  onChange={(e) => { handleFiles(e.target.files); }}
                />
              </div>
            )}
          </div>

          {loading ? (
            <p className="muted flex" style={{ justifyContent: 'center', padding: '24px 0' }}><span className="spinner" /> 加载中…</p>
          ) : !listable ? (
            <p className="muted" style={{ padding: '16px 0' }}>{note || '该存储当前不可用，请切换提供商或查看存储配置。'}</p>
          ) : visible.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>{mode === 'image' ? '该存储暂无图片资源，可先上传文件。' : '该存储暂无资源。'}</p>
          ) : (
            <div className="res-picker-grid">
              {visible.map((it) => (
                <div
                  key={it.key}
                  className={`res-picker-card${selected?.key === it.key ? ' on' : ''}`}
                  onClick={() => setSelected(it)}
                  onDoubleClick={() => { setSelected(it); onSelect(it); }}
                  title={it.key}
                >
                  {it.type === 'image' ? (
                    <img src={it.url} alt={it.name} loading="lazy" />
                  ) : (
                    <span className="res-picker-file">{it.type === 'video' ? '▶ 视频' : '文件'}</span>
                  )}
                  <span className="res-picker-name">{it.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {selected && (
            <span className="res-picker-preview">
              {selected.type === 'image' && <img src={selected.url} alt="" />}
              <span className="ellip" title={selected.url}>{selected.name} · {formatSize(selected.size)}</span>
            </span>
          )}
          <button className="ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!selected} onClick={insert}>插入{mode === 'image' ? '图片' : '链接'}</button>
        </div>
      </div>
    </div>
  );
}