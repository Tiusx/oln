import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';
import MarkdownEditor from '../ui/MarkdownEditor';

export default function PagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [pr, cr] = await Promise.all([api.listPages(), api.getConfig()]);
      setPages(pr.data);
      setConfig(cr.data);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const menuEntries = config?.nav?.menu || [];
  const inMenu = (pageId: string) => menuEntries.some((m: any) => m.type === 'page' && m.pageId === pageId);

  async function persistNav(nextMenu: any[]) {
    const next = { ...config, nav: { ...(config.nav || { builtin: {} }), menu: nextMenu } };
    try {
      await api.saveConfig(next);
      setConfig(next);
      toast('导航已更新', 'success');
      return true;
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
      return false;
    }
  }

  async function addToMenu(page: any) {
    if (inMenu(page.id)) return;
    const ok = await persistNav([
      ...menuEntries,
      { type: 'page', pageId: page.id, label: page.title, url: `/${page.slug}`, newWindow: false },
    ]);
    if (ok) load();
  }

  async function removeFromMenu(page: any) {
    if (!(await confirm({ title: '移出导航', message: `确定将 "${page.title}" 从导航菜单中移出吗？`, danger: true }))) return;
    const ok = await persistNav(menuEntries.filter((m: any) => !(m.type === 'page' && m.pageId === page.id)));
    if (ok) load();
  }

  async function create() {
    if (!newTitle.trim()) {
      toast('请输入页面标题', 'error');
      return;
    }
    try {
      await api.createPage({ title: newTitle.trim(), content: newContent });
      toast('页面已创建', 'success');
      setCreating(false);
      setNewTitle('');
      setNewContent('');
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
          <div className="editor-field">
            <label className="editor-label">页面标题（如：关于、友链）</label>
            <input
              className="field-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="页面标题（如：关于、友链）…"
            />
          </div>
          <div className="editor-field" style={{ marginTop: 14 }}>
            <label className="editor-label">内容（Markdown）</label>
            <MarkdownEditor value={newContent} onChange={setNewContent} placeholder="输入页面内容…" minHeight={180} />
          </div>
          <div className="flex" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setCreating(false)}>取消</button>
            <button className="btn" onClick={create}>创建页面</button>
          </div>
        </section>
      )}

      <section className="panel">
        {pages.length === 0 && <div className="state-box">还没有页面，点击右上角新建～</div>}
        <div className="page-list">
          {pages.map((p) => (
            <PageRow
              key={p.id}
              page={p}
              inMenu={inMenu(p.id)}
              onSaved={load}
              onAddToMenu={addToMenu}
              onRemoveFromMenu={removeFromMenu}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PageRow({ page, inMenu, onSaved, onAddToMenu, onRemoveFromMenu }: {
  page: any;
  inMenu: boolean;
  onSaved: () => void;
  onAddToMenu: (page: any) => void;
  onRemoveFromMenu: (page: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [content, setContent] = useState(page.content);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  async function save() {
    try {
      await api.updatePage(page.id, { title, slug, content });
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
            {inMenu ? <span className="pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>在导航</span> : <span className="pill" style={{ background: 'var(--bg-soft)', color: 'var(--muted)' }}>不在导航</span>}
          </span>
        </div>
        <div className="page-row-actions">
          {inMenu
            ? <button className="btn sm ghost" onClick={() => onRemoveFromMenu(page)}>移出导航</button>
            : <button className="btn sm" onClick={() => onAddToMenu(page)}>+ 加入导航</button>}
          <button className="btn sm ghost" onClick={() => setEditing(true)}>编辑</button>
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
          <label className="editor-label">导航状态</label>
          <div className="flex" style={{ paddingTop: 6 }}>
            {inMenu
              ? <button className="btn sm ghost" onClick={() => onRemoveFromMenu(page)}>移出导航</button>
              : <button className="btn sm" onClick={() => onAddToMenu(page)}>+ 加入导航</button>}
          </div>
        </div>
      </div>
      <div className="editor-field">
        <label className="editor-label">内容（Markdown）</label>
        <MarkdownEditor value={content} onChange={setContent} minHeight={260} />
      </div>
      <div className="flex" style={{ marginTop: 10 }}>
        <button className="btn" onClick={save}>保存</button>
        <button className="btn ghost" onClick={() => setEditing(false)}>取消</button>
      </div>
    </div>
  );
}