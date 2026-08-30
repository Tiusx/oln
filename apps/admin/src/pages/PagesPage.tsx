import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

export default function PagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    api.listPages().then((r) => setPages(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!newTitle.trim()) {
      toast('请输入页面标题', 'error');
      return;
    }
    try {
      await api.createPage({ title: newTitle.trim(), content: '' });
      toast('页面已创建', 'success');
      setCreating(false);
      setNewTitle('');
      load();
    } catch (e: any) {
      toast(e.message || '创建失败', 'error');
    }
  }

  return (
    <div className="pages">
      <div className="flex between toolbar pages-head">
        <h1 className="page-title">页面</h1>
        <button className="btn" onClick={() => setCreating(!creating)}>{creating ? '取消' : '+ 新页面'}</button>
      </div>

      {creating && (
        <section className="panel add-page-panel">
          <div className="flex add-row">
            <input
              className="field-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="页面标题（如：关于、友链）…"
            />
            <button className="btn" onClick={create}>创建</button>
          </div>
        </section>
      )}

      <section className="panel">
        {pages.length === 0 && <p className="muted">还没有页面，点击右上角新建～</p>}
        <div className="page-list">
          {pages.map((p) => <PageRow key={p.id} page={p} onSaved={load} />)}
        </div>
      </section>
    </div>
  );
}

function PageRow({ page, onSaved }: { page: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [content, setContent] = useState(page.content);
  const [showInMenu, setShowInMenu] = useState(!!page.showInMenu);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  async function save() {
    try {
      await api.updatePage(page.id, { title, slug, content, showInMenu });
      toast('页面已保存', 'success');
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  async function remove() {
    if (!(await confirm({ title: '删除页面', message: `确定删除页面 "${page.title}" 吗？`, danger: true }))) return;
    try {
      await api.deletePage(page.id);
      toast('页面已删除', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  if (!editing) {
    return (
      <div className="page-row">
        <div className="page-row-main">
          <span className="page-row-title">{page.title}</span>
          <span className="page-row-meta">
            <span className="path">/{page.slug}</span>
            <span className="dot">·</span>
            {page.status === 'published' ? <span className="pill ok">已发布</span> : <span className="pill warn">草稿</span>}
            <span className="dot">·</span>
            {page.showInMenu ? '显示在导航' : '不在导航'}
          </span>
        </div>
        <div className="page-row-actions">
          <button className="btn sm" onClick={() => setEditing(true)}>编辑</button>
          <button className="btn danger sm" onClick={remove}>删除</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-row editing">
      <div className="editor-field">
        <label className="editor-label">标题</label>
        <input className="editor-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="link-form-row">
        <div className="editor-field">
          <label className="editor-label">Slug</label>
          <input className="editor-input" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div className="editor-field menu-toggle-field">
          <label className="editor-toggle" style={{ marginTop: 24 }}>
            <input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            显示在导航
          </label>
        </div>
      </div>
      <div className="editor-field">
        <label className="editor-label">内容（Markdown）</label>
        <textarea className="editor-input" value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
      </div>
      <div className="flex" style={{ marginTop: 10 }}>
        <button className="btn" onClick={save}>保存</button>
        <button className="btn ghost" onClick={() => setEditing(false)}>取消</button>
      </div>
    </div>
  );
}
