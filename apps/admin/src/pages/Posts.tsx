import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  pinned: boolean;
  publishedAt: string | null;
  categoryId: string | null;
  coverImage: string | null;
  excerpt: string | null;
  content: string;
  tags: { id: string; name: string; slug: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
}

interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  categoryId?: string | null;
  coverImage?: string | null;
  status?: 'draft' | 'published';
  pinned?: boolean;
  publishedAt?: string | null;
  tagIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

type ExportFormat = 'json' | 'md';

function postsToJson(posts: Post[]) {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    total: posts.length,
    posts: posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      status: p.status,
      pinned: p.pinned,
      publishedAt: p.publishedAt,
      categoryId: p.categoryId,
      coverImage: p.coverImage,
      tags: p.tags.map((t) => t.name),
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    })),
  };
}

function postsToMarkdown(posts: Post[]): string {
  const lines: string[] = [];
  lines.push(`# 文章导出 - ${new Date().toLocaleString()}`);
  lines.push(`共 ${posts.length} 篇文章`);
  lines.push('---');
  lines.push('');
  for (const p of posts) {
    lines.push(`## ${p.title}`);
    lines.push('');
    lines.push('---');
    lines.push(`slug: ${p.slug}`);
    lines.push(`status: ${p.status}`);
    lines.push(`pinned: ${p.pinned}`);
    lines.push(`publishedAt: ${p.publishedAt || ''}`);
    if (p.categoryId) lines.push(`categoryId: ${p.categoryId}`);
    if (p.coverImage) lines.push(`coverImage: ${p.coverImage}`);
    if (p.excerpt) lines.push(`excerpt: ${p.excerpt}`);
    if (p.seoTitle) lines.push(`seoTitle: ${p.seoTitle}`);
    if (p.seoDescription) lines.push(`seoDescription: ${p.seoDescription}`);
    if (p.tags.length) lines.push(`tags: ${p.tags.map((t) => t.name).join(', ')}`);
    lines.push('---');
    lines.push('');
    lines.push(p.content || '');
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Import: format auto-detection + normalization
// ---------------------------------------------------------------------------

/** Parse a YAML-ish `key: value` frontmatter block into an object. */
function parseFrontmatter(block: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('---')) continue;
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = val || '';
    }
  }
  return meta;
}

/** Normalize a raw imported post into a valid PostInput, tagging issues. */
function normalizeImportItem(item: any): { input: PostInput | null; error: string | null; tags: unknown } {
  const tags = item?.tags;
  const title = item && typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return { input: null, error: '缺少标题（title）', tags };
  if (title.length > 200) return { input: null, error: `标题超长（${title.length}/200）: ${title.slice(0, 24)}…`, tags };

  // publishedAt: 空串 / 非法值 -> null
  let publishedAt: string | null = null;
  if (item.publishedAt != null && item.publishedAt !== '') {
    const d = new Date(item.publishedAt);
    if (!isNaN(d.getTime())) publishedAt = d.toISOString();
  }

  // slug: 空串 -> 交给服务端根据标题自动生成
  const slug = item.slug && String(item.slug).trim() ? String(item.slug).trim() : undefined;

  // tags：支持数组或逗号分隔字符串
  let tagIds: string[] = [];
  let categoryId: string | null = item.categoryId ?? null;

  const input: PostInput = {
    title,
    slug,
    excerpt: item.excerpt == null || item.excerpt === '' ? null : String(item.excerpt).slice(0, 500),
    content: item.content == null ? '' : String(item.content),
    categoryId,
    coverImage: item.coverImage || null,
    status: item.status === 'published' ? 'published' : 'draft',
    pinned: item.pinned === true || item.pinned === 'true' || item.pinned === 1,
    publishedAt,
    tagIds,
    seoTitle: item.seoTitle || null,
    seoDescription: item.seoDescription || null,
  };
  return { input, error: null, tags };
}

/** Detect the input format from raw text. */
function detectPostFormat(text: string): 'json' | 'markdown' {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  return 'markdown';
}

/** Parse a JSON import: array, single object, or wrapped {posts:[...]}. */
function parseJsonPosts(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.posts)) return data.posts;
  if (data && typeof data === 'object') return [data];
  return [];
}

/**
 * Parse Markdown into posts. Supports:
 *  - the blog's own export (multiple posts, each `## 标题` + YAML-ish meta + body,
 *    separated by `---`)
 *  - a single standard front-matter document (`---\n title: ...\n ---\n body`)
 */
function parseMarkdownPosts(md: string): any[] {
  const posts: any[] = [];
  const sections = md.split(/^---\s*$/m).map((s) => s.trim());

  // Collect (metaBlockOrTitle, body) pairs. Odd indices after `---` are metadata
  // blocks; even indices are bodies. Handle step of 2.
  for (let i = 1; i + 1 < sections.length; i += 2) {
    const block = sections[i];
    const body = sections[i + 1] ?? '';
    if (!block && !body) continue;
    const meta = parseFrontmatter(block);
    posts.push({ ...meta, content: body });
  }

  // If the above found a single post with a title but a blank meta block lies at
  // index 1, fall back / merge sensibly. If nothing found, try a plain heading split.
  if (posts.length === 0) return posts;

  // Convert `## 标题` shorthand when frontmatter lacks `title`.
  for (const p of posts) {
    if (!p.title && p.content) {
      const m = p.content.match(/^#{1,6}\s+(.+?)\s*\n/);
      if (m) {
        p.title = m[1].trim();
        p.content = p.content.replace(/^#{1,6}\s+.+?\s*\n/, '');
      }
    }
  }
  return posts;
}

/** Single entry point: raw file text -> normalized array of {input,error}. */
function parseImportFile(name: string, text: string): { input: PostInput | null; error: string | null; tags: unknown }[] {
  const isJson = /\.json$/i.test(name) || detectPostFormat(text) === 'json';
  let rawItems: any[];
  try {
    if (isJson) {
      rawItems = parseJsonPosts(JSON.parse(text));
      // tolerate a bare single-post object
      if (!Array.isArray(rawItems)) rawItems = [rawItems];
    } else {
      rawItems = parseMarkdownPosts(text);
    }
  } catch (e: any) {
    return [{ input: null, error: `文件解析失败：${e.message || '未知错误'}`, tags: undefined }];
  }
  if (rawItems.length === 0) return [{ input: null, error: '文件中没有可导入的文章', tags: undefined }];
  return rawItems.map(normalizeImportItem);
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------
function jsonTemplate(): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: 1,
    total: 1,
    posts: [{
      title: '示例文章标题',
      slug: 'example-post',
      excerpt: '文章摘要，可留空',
      content: '# 标题\n\n这里是文章正文（Markdown）。',
      status: 'draft',
      pinned: false,
      publishedAt: null,
      categoryId: null,
      coverImage: null,
      tags: ['示例标签'],
      seoTitle: null,
      seoDescription: null,
    }],
  }, null, 2);
}

function markdownTemplate(): string {
  return [
    '# 文章导出模板',
    '说明：每个文章段落以 --- 分隔；frontmatter 键: 值 + 正文。import 时自动识别。',
    '---',
    '## 示例文章标题',
    '---',
    'slug: example-post',
    'status: draft',
    'tags: 示例标签, 另一个标签',
    '---',
    '正文内容（Markdown）。',
    '---',
  ].join('\n');
}

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [postsPerPage, setPostsPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 20;
  const { toast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    api.getConfig().then((r) => {
      setPostsPerPage(r.data?.basic?.postsPerPage ?? 10);
    }).catch(() => {});
  }, []);

  async function savePostsPerPage() {
    try {
      const r = await api.getConfig();
      const cfg = r.data;
      cfg.basic = { ...(cfg.basic || {}), postsPerPage: Number(postsPerPage) };
      await api.saveConfig(cfg);
      toast('首页每页文章数已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      if (q) params.q = q;
      const r = await api.listPosts(params);
      setPosts(r.data.items);
      setTotal(r.data.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!(await confirm({ title: '删除文章', message: '确定删除这篇文章吗？此操作无法撤销。', danger: true }))) return;
    // 乐观删除：先从本地状态移除，避免整个表格闪烁
    const title = posts.find((p) => p.id === id)?.title || '';
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      await api.deletePost(id);
      toast('文章已删除', 'success');
      // 若当前页删空且不是第一页，回退一页；否则静默重算分页数据
      if (posts.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        refreshSilently();
      }
    } catch (e: any) {
      // 失败回滚 + 刷新
      toast(`删除失败：${e.message || '未知错误'}`, 'error');
      load();
    }
  }

  /** 不触发 loading 状态的静默刷新（用于删除后的计数/排序校正）。 */
  async function refreshSilently() {
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      if (q) params.q = q;
      const r = await api.listPosts(params);
      setPosts(r.data.items);
      setTotal(r.data.total);
    } catch { /* 忽略 */ }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = posts.map((p) => p.id);
    const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function batchDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast('请先勾选要删除的文章', 'error'); return; }
    if (!(await confirm({ title: '批量删除', message: `确定删除选中的 ${ids.length} 篇文章吗？此操作无法撤销。`, danger: true }))) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await api.deletePost(id); ok++; } catch { fail++; }
    }
    setSelected(new Set());
    if (fail > 0) toast(`已删除 ${ok} 篇，失败 ${fail} 篇`, 'error');
    else toast(`已删除 ${ok} 篇文章`, 'success');
    load();
  }

  async function exportPosts(format: ExportFormat) {
    try {
      const r = await api.listPosts({ page: '1', limit: '1000', status, q });
      const items = r.data.items;
      if (format === 'json') {
        downloadFile(JSON.stringify(postsToJson(items), null, 2), `posts-export-${dateStr()}.json`, 'application/json');
      } else {
        downloadFile(postsToMarkdown(items), `posts-export-${dateStr()}.md`, 'text/markdown');
      }
      toast(`导出 ${format.toUpperCase()} 成功`, 'success');
    } catch (e: any) {
      toast(e.message || '导出失败', 'error');
    }
  }

  async function handleImport(file: File) {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseImportFile(file.name, text);

      // 预解析 tag -> id 映射（复用一次请求）
      const tagBySlug: Record<string, string> = {};
      try {
        for (const t of (await api.listTags()).data) tagBySlug[t.slug] = t.id;
      } catch { /* 忽略标签解析失败，不影响正文导入 */ }

      const wantTagsFor = async (tags: unknown): Promise<string[]> => {
        const names = typeof tags === 'string'
          ? tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
          : Array.isArray(tags)
            ? tags.map((t) => (typeof t === 'string' ? t : (t && t.name) || '')).filter(Boolean)
            : [];
        const ids: string[] = [];
        for (const name of names) {
          const slug = name.trim();
          if (tagBySlug[slug]) { ids.push(tagBySlug[slug]); continue; }
          try {
            const created = await api.createTag({ name });
            ids.push(created.data.id);
            tagBySlug[slug] = created.data.id;
            if (created.data.id) tagBySlug[name] = created.data.id;
          } catch { /* 标签创建失败则跳过该标签 */ }
        }
        return ids;
      };

      let success = 0, failed = 0;
      const errors: string[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const { input, error, tags } = parsed[i];
        if (!input) { failed++; errors.push(`第 ${i + 1} 篇：${error}`); continue; }
        try {
          input.tagIds = await wantTagsFor(tags);
          await api.createPost(input);
          success++;
        } catch (e: any) {
          failed++;
          errors.push(`第 ${i + 1} 篇「${input.title}」：${e.message || '导入失败'}`);
        }
      }

      if (failed > 0 && errors.length) {
        toast(`导入完成：成功 ${success}，失败 ${failed}。${errors.slice(0, 3).join('；')}${errors.length > 3 ? ` 等 ${errors.length} 条` : ''}`, 'error');
      } else {
        toast(`导入完成：成功 ${success} 篇`, 'success');
      }
      if (success > 0) load();
    } catch (e: any) {
      toast(e.message || '导入失败（仅支持 .json / .md / .markdown 文件）', 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const fmt = exportFormat;
    if (fmt === 'json') {
      downloadFile(jsonTemplate(), 'posts-template.json', 'application/json;charset=utf-8');
    } else {
      downloadFile(markdownTemplate(), 'posts-template.md', 'text/markdown;charset=utf-8');
    }
    toast('数据格式模板已下载', 'info');
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
    e.target.value = '';
  }

  function dateStr() { return new Date().toISOString().slice(0, 10); }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">文章</h1>
        <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn" to="/posts/new">+ 新文章</Link>
          <select className="field-input" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)} style={{ width: 100 }}>
            <option value="json">JSON</option>
            <option value="md">Markdown</option>
          </select>
          <button className="btn secondary" onClick={() => exportPosts(exportFormat)} disabled={loading}>导出</button>
          <button className="btn secondary" onClick={downloadTemplate} title="下载数据格式模板文件">下载模板</button>
          <label className="btn">
            {importing ? <><span className="spinner-sm" /> 导入中…</> : '导入'}
            <input type="file" accept=".json,.md,.markdown" onChange={onFileChange} style={{ display: 'none' }} disabled={importing} />
          </label>
        </div>
      </div>

      <div className="panel toolbar flex">
        <input className="field-input" type="text" placeholder="搜索标题或内容" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} />
        <select className="field-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ maxWidth: 140 }}>
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0, marginLeft: 'auto' }}>
          <label className="field-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>首页每页文章数</label>
          <input
            className="field-input"
            type="number"
            min={1}
            max={50}
            style={{ width: 76 }}
            value={postsPerPage}
            onChange={(e) => setPostsPerPage(Number(e.target.value))}
          />
          <button className="btn secondary sm" onClick={savePostsPerPage}>保存</button>
        </div>
      </div>

      {selected.size > 0 && !loading && (
        <div className="panel toolbar flex between" style={{ marginBottom: 12 }}>
          <span className="muted">已选 {selected.size} 篇文章</span>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn danger sm" onClick={batchDelete}>批量删除</button>
            <button className="btn secondary sm" onClick={() => setSelected(new Set())}>取消选择</button>
          </div>
        </div>
      )}

      {loading ? <p className="muted flex"><span className="spinner" /> 加载中…</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={posts.length > 0 && posts.every((p) => selected.has(p.id))} onChange={toggleSelectAll} aria-label="选择本页全部" />
              </th>
              <th>标题</th><th>状态</th><th>标签</th><th>发布时间</th><th>操作</th>
            </tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} style={{ opacity: selected.has(p.id) ? 0.6 : 1 }}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} aria-label={`选择 ${p.title}`} />
                  </td>
                  <td><Link to={`/posts/${p.id}`}>{p.pinned ? '📌 ' : ''}{p.title}</Link></td>
                  <td><span className={`badge ${p.status}`}>{p.status === 'published' ? '已发布' : '草稿'}</span></td>
                  <td>{p.tags.map((t) => t.name).join(', ')}</td>
                  <td>{p.publishedAt ? new Date(p.publishedAt).toLocaleString() : '-'}</td>
                  <td>
                    <Link className="btn sm" to={`/posts/${p.id}`} style={{ marginRight: 6 }}>编辑</Link>
                    <button className="btn danger sm" onClick={() => remove(p.id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pager">
        <button className="btn secondary sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
        <span className="muted">第 {page} / {totalPages} 页，共 {total} 篇</span>
        <button className="btn secondary sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
      </div>
    </div>
  );
}