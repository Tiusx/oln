import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';
import MarkdownEditor from '../ui/MarkdownEditor';
import ResourcePicker from '../ui/ResourcePicker';
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

function isAsciiTag(v: string) {
  return /^[A-Za-z0-9\s\-]+$/.test(v);
}

function normalizeTagName(v: string) {
  const t = v.trim();
  if (!t) return '';
  if (isAsciiTag(t)) return t.replace(/(^|[\s-])([a-zA-Z0-9])/g, (m) => m.toUpperCase());
  return t;
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
  const [coverPicker, setCoverPicker] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagFocused, setTagFocused] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [publishedAt, setPublishedAt] = useState(isEdit ? '' : toLocalInput(new Date().toISOString()));
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const { toast } = useToast();

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

  async function addTagByName(raw: string) {
    const name = normalizeTagName(raw);
    if (!name) return;
    const selectedNames = tagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => t.name.toLowerCase());
    if (selectedNames.includes(name.toLowerCase())) { setTagInput(''); return; }
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    let id: string;
    if (existing) {
      id = existing.id;
    } else {
      try {
        const r = await api.createTag({ name });
        id = r.data.id;
        setTags((prev) => [...prev, { id, name, slug: '' }]);
        toast(`已新建标签「${name}」`, 'info');
      } catch (e: any) {
        toast(e.message || '标签创建失败', 'error');
        return;
      }
    }
    setTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTagInput('');
  }

  const selectedTags = tagIds.map((id) => tags.find((t) => t.id === id)).filter(Boolean);
  const tagQuery = tagInput.trim().toLowerCase();
  const tagSuggestions = tagQuery
    ? tags.filter((t) => !tagIds.includes(t.id) && t.name.toLowerCase().includes(tagQuery)).slice(0, 8)
    : [];

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
            <div className="editor-card-title">内容</div>
            <label className="editor-label">标题</label>
            <input
              className="editor-title-input"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="输入一个吸引人的标题…"
            />
            <div className="editor-grid2" style={{ marginTop: 18 }}>
              <div className="editor-field">
                <label className="editor-label">Slug（URL 别名）</label>
                <input className="editor-input" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-slug" />
              </div>
              <div className="editor-field">
                <label className="editor-label">封面图 URL</label>
                <div className="res-url-input">
                  <input className="editor-input" type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://…" />
                  <button className="btn sm" type="button" onClick={() => setCoverPicker(true)} title="从资源库选择">资源库</button>
                </div>
              </div>
            </div>
          </div>

          <div className="editor-card">
            <div className="editor-card-title">正文</div>
            <MarkdownEditor value={content} onChange={setContent} placeholder="开始书写你的想法…" />
          </div>

          <div className="editor-card">
            <div className="editor-card-title">摘要</div>
            <label className="editor-label">（留空将自动截取正文开头）</label>
            <textarea className="editor-input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="简要描述这篇文章…" rows={3} />
          </div>

          <div className="editor-card">
            <div className="editor-card-title">发布设置</div>
            <div className="editor-grid2">
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
            </div>

            <div className="editor-field" style={{ marginTop: 16 }}>
              <label className="editor-label">标签</label>
              <div className="tag-input-wrap">
                <input
                  className="editor-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onFocus={() => setTagFocused(true)}
                  onBlur={() => setTimeout(() => setTagFocused(false), 120)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTagByName(tagInput); }
                    if (e.key === 'Backspace' && !tagInput && selectedTags.length) {
                      setTagIds((prev) => prev.slice(0, -1));
                    }
                  }}
                  style={{ maxWidth: 340 }}
                  placeholder="输入标签后回车创建，或输入关键字检索已有标签…"
                />
                {tagFocused && tagSuggestions.length > 0 && (
                  <div className="tag-suggest">
                    {tagSuggestions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="tag-suggest-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addTagByName(t.name)}
                      >
                        <span className="tag-suggest-name">#{t.name}</span>
                        <span className="tag-suggest-tag">已有</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="tag-selected">
                {selectedTags.length === 0 ? (
                  <span className="muted" style={{ fontSize: 13 }}>还没有标签</span>
                ) : selectedTags.map((t) => (
                  <span key={t.id} className="chip">
                    #{t.name}
                    <button
                      className="chip-x"
                      title={`移除 ${t.name}`}
                      onClick={() => setTagIds((prev) => prev.filter((x) => x !== t.id))}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="editor-toggles" style={{ marginTop: 16 }}>
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
      {coverPicker && (
        <ResourcePicker
          mode="image"
          onSelect={(item) => { setCoverImage(item.url); setCoverPicker(false); }}
          onClose={() => setCoverPicker(false)}
        />
      )}
    </div>
  );
}
