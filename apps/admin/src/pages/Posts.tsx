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

function parseMarkdown(md: string) {
  const posts: any[] = [];
  const parts = md.split(/^---$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const front = parts[i].trim();
    const content = (parts[i + 1] || '').trim();
    if (!front) continue;
    const meta: Record<string, string> = {};
    for (const line of front.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        meta[key] = val;
      }
    }
    posts.push({ ...meta, content });
  }
  return posts;
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
  const limit = 20;
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      if (q) params.q = q;
      const r = await api.listPosts(params);
      setPosts(r.data.items);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!(await confirm({ title: '删除文章', message: '确定删除这篇文章吗？此操作无法撤销。', danger: true }))) return;
    try {
      await api.deletePost(id);
      toast('文章已删除', 'success');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
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
      let items: any[] = [];
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        items = data.posts || data;
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        items = parseMarkdown(text);
      } else {
        throw new Error('仅支持 .json / .md 文件');
      }
      if (!Array.isArray(items)) throw new Error('无效的导入格式');
      let success = 0, failed = 0;
      for (const item of items) {
        try {
          let tagIds: string[] = [];
          if (item.tags) {
            const tagNames = typeof item.tags === 'string' ? item.tags.split(',').map((s: string) => s.trim()) : item.tags;
            const allTags = await api.listTags();
            tagIds = tagNames.map((name: string) => allTags.data.find((t) => t.name === name)?.id).filter(Boolean) as string[];
          }
          const input: PostInput = {
            title: item.title, slug: item.slug, excerpt: item.excerpt ?? null, content: item.content ?? '',
            categoryId: item.categoryId ?? null, coverImage: item.coverImage ?? null,
            status: (item.status as 'draft' | 'published') ?? 'draft',
            pinned: item.pinned === 'true' || item.pinned === true,
            publishedAt: item.publishedAt ?? null, tagIds,
            seoTitle: item.seoTitle ?? null, seoDescription: item.seoDescription ?? null,
          };
          await api.createPost(input);
          success++;
        } catch { failed++; }
      }
      toast(`导入完成：成功 ${success}，失败 ${failed}`, failed ? 'error' : 'success');
      load();
    } catch (e: any) {
      toast(e.message || '导入失败', 'error');
    } finally {
      setImporting(false);
    }
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
        <div className="flex" style={{ gap: 8 }}>
          <Link className="btn" to="/posts/new">+ 新文章</Link>
          <select className="field-input" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)} style={{ width: 100 }}>
            <option value="json">JSON</option>
            <option value="md">Markdown</option>
          </select>
          <button className="btn secondary" onClick={() => exportPosts(exportFormat)} disabled={loading}>导出</button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            导入
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
      </div>

      {loading ? <p className="muted">加载中...</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>标题</th><th>状态</th><th>标签</th><th>发布时间</th><th>操作</th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
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