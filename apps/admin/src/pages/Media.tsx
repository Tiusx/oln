import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

interface MediaItem {
  key: string;
  url: string;
  size: number;
  isImage?: boolean;
}

export default function Media() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [prefix, setPrefix] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    const r = await api.listMedia(prefix || undefined);
    setItems(r.data.map((m) => ({ ...m, isImage: /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(m.key) })));
  }, [prefix]);

  useEffect(() => { load(); }, [load]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await api.uploadMedia(f);
      }
      toast(`成功上传 ${files.length} 个文件`);
      load();
    } catch (e: any) {
      toast(e.message || '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function remove(key: string) {
    if (!(await confirm({ title: '删除文件', message: `确定删除 "${key}" 吗？此操作无法撤销。`, danger: true }))) return;
    try {
      await api.deleteMedia(key);
      toast('文件已删除');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => toast('URL 已复制到剪贴板', 'info'));
  }

  return (
    <div>
      <h1 className="page-title">媒体库</h1>

      <div className="panel">
        <div className="flex">
          <input type="text" className="field-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="路径前缀筛选（如：img/）" />
          <button className="secondary" onClick={() => setPrefix('')}>清除</button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            {uploading ? <><span className="spinner-sm" /> 上传中...</> : '上传文件'}
            <input type="file" multiple hidden onChange={(e) => onUpload(e.target.files)} />
          </label>
        </div>
      </div>

      <div className="media-grid">
        {items.map((m) => (
          <div className="media-item" key={m.key}>
            {m.isImage ? (
              <img src={m.url} alt={m.key} />
            ) : (
              <div className="media-file-ico">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
            )}
            <div className="meta" title={m.key}>{m.key}</div>
            <div className="flex" style={{ padding: '0 6px 6px' }}>
              <button className="ghost" onClick={() => copyUrl(m.url)}>复制URL</button>
              <button className="danger" onClick={() => remove(m.key)}>删除</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="state-box" style={{ gridColumn: '1 / -1' }}>暂无文件，点击上方上传。</div>}
      </div>
    </div>
  );
}
