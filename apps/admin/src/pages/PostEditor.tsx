import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

let slugTimer: ReturnType<typeof setTimeout> | null = null;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'warn' },
  published: { label: '已发布', cls: 'ok' },
};

export default function PostEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [pinned, setPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    setContent((prev) => {
      const ta = document.querySelector('.md') as HTMLTextAreaElement;
      const start = ta?.selectionStart ?? 0;
      const end = ta?.selectionEnd ?? 0;
      const selected = prev.slice(start, end);
      const text = prefix + selected + suffix;
      const newVal = prev.slice(0, start) + text + prev.slice(end);
      requestAnimationFrame(() => {
        if (ta) {
          ta.focus();
          ta.selectionStart = start + prefix.length;
          ta.selectionEnd = end + prefix.length + (selected ? suffix.length : 0);
        }
      });
      return newVal;
    });
  }, []);

  useEffect(() => {
    api.listTags().then((r) => setTags(r.data)).catch(() => {});
    api.listCategories().then((r) => setCategories(r.data)).catch(() => {});
    if (isEdit) {
      api.getPost(id!).then((r) => {
        const p = r.data;
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt || '');
        setContent(p.content || '');
        setStatus(p.status || 'draft');
        setPinned(!!p.pinned);
        setCommentsEnabled(p.commentsEnabled !== false);
        setCategoryId(p.categoryId || '');
        setCoverImage(p.coverImage || '');
        setTagIds((p.tags || []).map((t: any) => t.id));
        setSeoTitle(p.seoTitle || '');
        setSeoDescription(p.seoDescription || '');
        setPublishedAt(p.publishedAt ? toLocalInput(p.publishedAt) : '');
        setLoading(false);
      }).catch((e) => { setError(e.message); setLoading(false); });
    }
  }, [isEdit, id]);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!isEdit) {
      if (slugTimer) clearTimeout(slugTimer);
      slugTimer = setTimeout(() => setSlug(slugify(v)), 300);
    }
  }

  async function save() {
    setError('');
    const payload = {
      title,
      slug: slug || undefined,
      excerpt: excerpt || null,
      content,
      status,
      pinned,
      commentsEnabled,
      categoryId: categoryId || null,
      coverImage: coverImage || null,
      tagIds,
      seoTitle: seoTitle || title || null,
      seoDescription: seoDescription || excerpt || null,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    };
    try {
      if (isEdit) {
        await api.updatePost(id!, payload);
        toast('文章已保存', 'success');
      } else {
        const r = await api.createPost(payload);
        toast('文章已创建并保存为草稿', 'success');
        navigate(`/posts/${r.data.id}`, { replace: true });
      }
    } catch (e: any) {
      setError(e.message);
      toast(e.message || '保存失败', 'error');
    }
  }

  function toggleTag(tid: string) {
    setTagIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
  }

  if (loading) return <p className="muted flex"><span className="spinner" /> 加载中…</p>;

  const statusMeta = STATUS_META[status] || STATUS_META.draft;

  return (
    <div className="editor">
      <div className="editor-topbar">
        <div className="editor-heading">
          <h1 className="editor-title">{isEdit ? '编辑文章' : '写一篇新文章'}</h1>
          <div className="editor-sub">
            <span className={`pill ${statusMeta.cls}`}>{statusMeta.label}</span>
            {isEdit && <span className="muted">{slug}</span>}
          </div>
        </div>
        <div className="editor-actions">
          <button className="btn ghost" onClick={() => navigate('/')}>返回</button>
          <button className="btn ghost" onClick={() => setPreview(!preview)}>{preview ? '✎ 编辑' : '👁 预览'}</button>
          <button className="btn btn-primary save" onClick={save}>保存</button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {preview ? (
        <div className="editor-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*暂无内容*'}</ReactMarkdown>
        </div>
      ) : (
        <>
          <div className="editor-card editor-cover">
            <label className="editor-label">标题</label>
            <input
              className="editor-title-input"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="输入一个吸引人的标题…"
            />
          </div>

          <div className="editor-card">
            <div className="editor-grid2">
              <div className="editor-field">
                <label className="editor-label">Slug（URL 别名）</label>
                <input className="editor-input" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-slug" />
              </div>
              <div className="editor-field">
                <label className="editor-label">分类</label>
                <select className="editor-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">未分类</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="editor-field">
                <label className="editor-label">状态</label>
                <select className="editor-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">草稿</option>
                  <option value="published">发布</option>
                </select>
              </div>
              <div className="editor-field">
                <label className="editor-label">发布时间</label>
                <input className="editor-input" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
              </div>
              <div className="editor-field">
                <label className="editor-label">封面图 URL</label>
                <input className="editor-input" type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://…" />
              </div>
              <div className="editor-field editor-toggles">
                <div className="editor-label">选项</div>
                <div className="editor-toggle-group">
                  <label className="editor-toggle">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                    <span className="toggle-track"><span className="toggle-thumb" /></span>
                    置顶
                  </label>
                  <label className="editor-toggle">
                    <input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} />
                    <span className="toggle-track"><span className="toggle-thumb" /></span>
                    开启评论
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="editor-card">
            <label className="editor-label">标签</label>
            <div className="tag-picks">
              {tags.map((t) => (
                <label key={t.id} className={`tag-pick${tagIds.includes(t.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} />
                  {t.name}
                </label>
              ))}
              {tags.length === 0 && <span className="muted">暂无标签</span>}
            </div>
          </div>

          <div className="editor-card">
            <label className="editor-label">正文（Markdown）</label>
            <div className="md-toolbar">
              <button type="button" onClick={() => wrapSelection('**', '**')} title="粗体">B</button>
              <button type="button" onClick={() => wrapSelection('*', '*')} title="斜体">I</button>
              <button type="button" onClick={() => wrapSelection('~~', '~~')} title="删除线">S</button>
              <button type="button" onClick={() => wrapSelection('`', '`')} title="行内代码"><code>{}</code></button>
              <span className="md-toolbar-sep" />
              <button type="button" onClick={() => wrapSelection('# ', '')} title="H1">H1</button>
              <button type="button" onClick={() => wrapSelection('## ', '')} title="H2">H2</button>
              <button type="button" onClick={() => wrapSelection('### ', '')} title="H3">H3</button>
              <span className="md-toolbar-sep" />
              <button type="button" onClick={() => wrapSelection('[', ']()')} title="链接">链接</button>
              <button type="button" onClick={() => wrapSelection('![', ']()')} title="图片">图片</button>
              <span className="md-toolbar-sep" />
              <button type="button" onClick={() => wrapSelection('- ', '')} title="无序列表">• 列表</button>
              <button type="button" onClick={() => wrapSelection('1. ', '')} title="有序列表">1. 列表</button>
              <button type="button" onClick={() => wrapSelection('> ', '')} title="引用">引用</button>
              <span className="md-toolbar-sep" />
              <button type="button" onClick={() => wrapSelection('```\n', '\n```\n')} title="代码块">代码块</button>
              <button type="button" onClick={() => wrapSelection('| 列1 | 列2 |\n|---|---|\n|  |  |', '')} title="表格">表格</button>
              <button type="button" onClick={() => wrapSelection('---\n', '')} title="分隔线">—</button>
              <button type="button" onClick={() => wrapSelection('- [ ] ', '')} title="任务列表">☐ 任务</button>
            </div>
            <textarea className="md" value={content} onChange={(e) => setContent(e.target.value)} placeholder="开始书写你的想法…" />
          </div>

          <div className="editor-card">
            <label className="editor-label">摘要</label>
            <textarea className="editor-input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="简要描述这篇文章…" rows={3} />
          </div>

          <details className="editor-card editor-seo">
            <summary>SEO 设置 <span className="editor-label" style={{ display: 'inline', margin: 0, fontWeight: 400 }}>（留空自动使用标题 / 摘要）</span></summary>
            <div className="editor-field">
              <label className="editor-label">SEO 标题
                {seoTitle === '' && title && <span style={{ fontWeight: 400 }}>· 将自动使用：<em>{title}</em></span>}
              </label>
              <input className="editor-input" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || '搜索引擎标题'} />
            </div>
            <div className="editor-field">
              <label className="editor-label">SEO 描述
                {seoDescription === '' && excerpt && <span style={{ fontWeight: 400 }}>· 将自动使用摘要</span>}
              </label>
              <textarea className="editor-input" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder={excerpt || '搜索引擎描述'} rows={3} />
            </div>
          </details>

          <div className="editor-sticky-actions">
            <button className="btn btn-primary save" onClick={save}>保存文章</button>
            <button className="btn ghost" onClick={() => navigate('/')}>取消</button>
          </div>
        </>
      )}
    </div>
  );
}
