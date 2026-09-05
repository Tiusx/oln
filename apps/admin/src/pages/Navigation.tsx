import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

type Settings = any;
type PageRow = { id: string; title: string; slug: string; status: string };

type MenuItem = {
  type: 'page' | 'link' | 'builtin';
  label: string;
  url: string;
  pageId?: string;
  newWindow: boolean;
  enabled: boolean;
};

const DEFAULT_BUILTIN: { label: string; url: string; enabled: boolean }[] = [
  { label: '文章', url: '/posts', enabled: true },
  { label: '归档', url: '/archive', enabled: true },
  { label: '标签', url: '/tags', enabled: true },
  { label: '友链', url: '/links', enabled: true },
  { label: '关于', url: '/about', enabled: true },
  { label: '留言板', url: '/message', enabled: true },
  { label: '一言', url: '/hitokoto', enabled: true },
];

// Normalize the config into one unified menu list:
// - legacy `nav.builtin.links` are folded in as `type: 'builtin'` entries
//   (disabled when the whole built-in nav was hidden);
// - empty menus (fresh sites) start from the built-in defaults.
function unifyNav(nav: any): MenuItem[] {
  const menu: MenuItem[] = (nav?.menu || []).map((m: any) => ({
    type: m.type === 'page' ? 'page' : m.type === 'builtin' ? 'builtin' : 'link',
    label: m.label || '',
    url: m.url || '',
    pageId: m.type === 'page' ? m.pageId : undefined,
    newWindow: !!m.newWindow,
    enabled: m.enabled !== false,
  }));

  if (nav?.builtin) {
    const urls = new Set(menu.map((m) => m.url));
    const hiddenAll = nav.builtin.show === false;
    for (const l of nav.builtin.links || []) {
      if (urls.has(l.url)) continue;
      menu.push({
        type: 'builtin',
        label: l.label || '',
        url: l.url || '',
        newWindow: false,
        enabled: hiddenAll ? false : l.enabled !== false,
      });
      urls.add(l.url);
    }
    return menu;
  }

  if (menu.length === 0) {
    return DEFAULT_BUILTIN.map((l) => ({ type: 'builtin', ...l, newWindow: false }));
  }
  return menu;
}

export default function Navigation() {
  const [config, setConfig] = useState<Settings | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [r, pr] = await Promise.all([api.getConfig(), api.listPages()]);
      setConfig(r.data);
      setItems(unifyNav(r.data.nav));
      setPages(pr.data);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!config) return <p className="muted flex"><span className="spinner" /> 加载中…</p>;

  const pagesById = new Map(pages.map((p) => [p.id, p]));
  const pagesBySlug = new Map<string, PageRow>();
  for (const p of pages) {
    if (!p.slug) continue;
    const prev = pagesBySlug.get(p.slug);
    if (!prev || (p.status === 'published' && prev.status !== 'published')) pagesBySlug.set(p.slug, p);
  }
  // Resolve the label for an entry: a matching published page overrides the nav default.
  const resolvedLabel = (m: MenuItem) => {
    if (m.type === 'page' && m.pageId) {
      const pg = pagesById.get(m.pageId);
      if (pg) return pg.title;
      return `${m.label}（页面已删除）`;
    }
    if (m.type === 'page') return m.label;
    const page = pagesBySlug.get(String(m.url || '').replace(/^\/+|\/+$/g, ''));
    return page && page.status === 'published' ? page.title : m.label;
  };

  const updateItem = (i: number, patch: Partial<MenuItem>) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  function addLinkItem() {
    setItems((prev) => [...prev, { type: 'link', label: '', url: '', newWindow: false, enabled: true }]);
  }
  function addPageItem(page: PageRow) {
    setItems((prev) => {
      if (prev.some((m) => (m.type === 'page' && m.pageId === page.id) || m.url === `/${page.slug}`)) return prev;
      return [...prev, { type: 'page', pageId: page.id, label: page.title, url: `/${page.slug}`, newWindow: false, enabled: true }];
    });
  }
  async function removeMenuItem(i: number, label: string) {
    const name = label || '该项';
    if (!(await confirm({ title: '删除菜单项', message: `确定从导航中移除「${name}」吗？`, danger: true }))) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function reorderBtn(i: number, total: number, onMove: (dir: -1 | 1) => void) {
    return (
      <span className="reorder-group">
        <button
          type="button"
          className="ghost sm reorder-btn"
          title="上移"
          aria-label="上移"
          disabled={i === 0}
          onClick={() => onMove(-1)}
        >↑</button>
        <button
          type="button"
          className="ghost sm reorder-btn"
          title="下移"
          aria-label="下移"
          disabled={i === total - 1}
          onClick={() => onMove(1)}
        >↓</button>
      </span>
    );
  }

  const usedUrls = new Set(items.map((m) => m.url));
  const pagesNotInMenu = pages.filter((p) =>
    p.status === 'published'
    && !items.some((m: MenuItem) => m.type === 'page' && m.pageId === p.id)
    && !usedUrls.has(`/${p.slug}`),
  );

  async function save() {
    const clean = items.map((it) => ({
      type: it.type,
      label: it.label || '',
      url: it.url || '',
      ...(it.type === 'page' ? { pageId: it.pageId } : {}),
      newWindow: !!it.newWindow,
      enabled: it.enabled !== false,
    }));
    try {
      await api.saveConfig({ ...config, nav: { menu: clean } });
      toast('导航配置已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">导航菜单</h1>
        <button onClick={save}>保存配置</button>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <h3 className="panel-title">菜单（内置、页面与自定义链接统一排列）</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: 12.5 }}>
          内置项不可删除、可开启/关闭显示；页面与自定义链接可删除。所有条目共同参与排序；菜单跳转地址若与页面地址重复，将优先显示页面标题。
        </p>
        {items.length === 0 && <div className="state-box" style={{ margin: '8px 0 14px' }}>还没有菜单项，可添加自定义链接或从下方列表把页面加入导航。</div>}
        {items.map((item: MenuItem, i: number) => {
          const isBuiltin = item.type === 'builtin';
          const isPage = item.type === 'page';
          const matchedPage = !isPage && !isBuiltin ? pagesBySlug.get(String(item.url || '').replace(/^\/+|\/+$/g, '')) : undefined;
          return (
            <div key={`${item.pageId || item.type}-${i}`} className="menu-row">
              <span className="menu-row-lead">
                {reorderBtn(i, items.length, (dir) => moveItem(i, dir))}
                <span className={`menu-type${isPage ? ' is-page' : isBuiltin ? ' is-builtin' : ''}`}>
                  {isPage ? '页面' : isBuiltin ? '内置' : '链接'}
                </span>
              </span>

              <div className="menu-row-body">
                {isPage ? (
                  <>
                    <span className="menu-page-title">{resolvedLabel(item)}</span>
                    <span className="menu-page-slug" title="由页面自动生成">{item.url || ''}</span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="field-input menu-label"
                      value={item.label}
                      placeholder="名称"
                      onChange={(e) => updateItem(i, { label: e.target.value })}
                    />
                    <input
                      type="text"
                      className="field-input menu-url"
                      value={item.url || ''}
                      placeholder="/链接"
                      onChange={(e) => {
                        const raw = (e.target.value || '').replace(/^\/+|\/+$/g, '');
                        updateItem(i, isBuiltin ? { url: e.target.value } : { url: raw ? `/${raw}` : '', pageId: undefined, type: 'link' });
                      }}
                    />
                    {matchedPage && matchedPage.status === 'published' && (
                      <span className="menu-page-slug matched" title={`存在同名页面「${matchedPage.title}」，将覆盖该链接名称与内容`}>
                        覆盖于页面
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="menu-row-actions">
                {!isPage && !isBuiltin && (
                  <label className="field-checkbox-label">
                    <input type="checkbox" checked={!!item.newWindow} onChange={(e) => updateItem(i, { newWindow: e.target.checked })} />
                    新窗口
                  </label>
                )}
                <label className="field-checkbox-label">
                  <input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateItem(i, { enabled: e.target.checked })} />
                  显示
                </label>
                {!isBuiltin && (
                  <button className="danger" onClick={() => removeMenuItem(i, resolvedLabel(item))}>×</button>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex" style={{ gap: 10, marginTop: 4 }}>
          <button className="secondary" onClick={addLinkItem}>+ 添加链接</button>
          {pagesNotInMenu.length > 0 && (
            <details className="add-page-picker">
              <summary className="secondary" style={{ listStyle: 'none' }}>+ 添加页面</summary>
              <div className="add-page-options">
                {pagesNotInMenu.map((p) => (
                  <button key={p.id} className="ghost" onClick={() => addPageItem(p)}>
                    <span className="page-opt-title">{p.title}</span>
                    <span className="page-opt-slug">/{p.slug}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}