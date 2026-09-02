import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

type Settings = any;

const DEFAULT_BUILTIN = [
  { label: '文章', url: '/posts', enabled: true },
  { label: '归档', url: '/archive', enabled: true },
  { label: '标签', url: '/tags', enabled: true },
  { label: '友链', url: '/links', enabled: true },
  { label: '关于', url: '/about', enabled: true },
  { label: '留言板', url: '/message', enabled: true },
  { label: '一言', url: '/hitokoto', enabled: true },
];

export default function Navigation() {
  const [config, setConfig] = useState<Settings | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const r = await api.getConfig();
    setConfig(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!config) return <p className="muted flex"><span className="spinner" /> 加载中…</p>;

  const nav = config.nav || { builtin: { show: true, links: [] }, menu: [] };
  const setNav = (fn: (n: any) => any) => setConfig((p: any) => ({ ...p, nav: fn(p.nav || {}) }));

  const builtin = nav.builtin || { show: true, links: DEFAULT_BUILTIN };
  const menu = nav.menu || [];

  const updateBuiltin = (fn: (b: any) => any) => setNav((n: any) => ({ ...n, builtin: fn(n.builtin || { show: true, links: DEFAULT_BUILTIN }) }));
  const updateMenu = (fn: (m: any[]) => any[]) => setNav((n: any) => ({ ...n, menu: fn(n.menu || []) }));

  async function save() {
    try {
      await api.saveConfig(config);
      toast('导航配置已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  function addMenuItem() {
    updateMenu(m => [...m, { label: '', url: '', newWindow: false }]);
  }
  function removeMenuItem(i: number) {
    updateMenu(m => m.filter((_, idx) => idx !== i));
  }
  function updateMenuItem(i: number, patch: any) {
    updateMenu(m => m.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }
  function updateBuiltinLink(i: number, patch: any) {
    updateBuiltin(b => ({ ...b, links: b.links.map((l: any, idx: number) => idx === i ? { ...l, ...patch } : l) }));
  }
  // Move an item up/down; returns the new array (no-op at the array edges).
  function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }
  function moveBuiltinLink(i: number, dir: -1 | 1) {
    updateBuiltin(b => ({ ...b, links: move(b.links, i, dir) }));
  }
  function moveMenuItem(i: number, dir: -1 | 1) {
    updateMenu(m => move(m, i, dir));
  }
  // Render an up/down reorder control pair.
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

  return (
    <div>
      <div className="flex between toolbar">
        <h1 className="page-title">导航菜单</h1>
        <button onClick={save}>保存配置</button>
      </div>

      <div className="panel">
        <h3 className="panel-title">内置导航</h3>
        <label className="field-checkbox-label" style={{ margin: '8px 0 12px', fontWeight: 600 }}>
          <input type="checkbox" checked={builtin.show !== false} onChange={(e) => updateBuiltin(b => ({ ...b, show: e.target.checked }))} />
          显示默认导航（文章 / 归档 / 标签 / 友链 / 关于 / 留言板 / 一言）
        </label>

        {(builtin.links || []).map((link: any, i: number) => (
          <div key={i} className="flex" style={{ marginBottom: 8 }}>
            {reorderBtn(i, builtin.links.length, (dir) => moveBuiltinLink(i, dir))}
            <input type="text" className="field-input" value={link.label} placeholder="名称" style={{ width: 140 }} onChange={(e) => updateBuiltinLink(i, { label: e.target.value })} />
            <input type="text" className="field-input" value={link.url} placeholder="/链接" style={{ width: 180 }} onChange={(e) => updateBuiltinLink(i, { url: e.target.value })} />
            <label className="field-checkbox-label">
              <input type="checkbox" checked={link.enabled !== false} onChange={(e) => updateBuiltinLink(i, { enabled: e.target.checked })} />
              显示
            </label>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 className="panel-title">自定义菜单</h3>
        {menu.map((item: any, i: number) => (
          <div key={i} className="flex" style={{ marginBottom: 8 }}>
            {reorderBtn(i, menu.length, (dir) => moveMenuItem(i, dir))}
            <input type="text" className="field-input" value={item.label} placeholder="名称" style={{ width: 140 }} onChange={(e) => updateMenuItem(i, { label: e.target.value })} />
            <input type="text" className="field-input" value={item.url} placeholder="/链接" onChange={(e) => updateMenuItem(i, { url: e.target.value })} />
            <label className="field-checkbox-label">
              <input type="checkbox" checked={item.newWindow} onChange={(e) => updateMenuItem(i, { newWindow: e.target.checked })} />
              新窗口
            </label>
            <button className="danger" onClick={() => removeMenuItem(i)}>×</button>
          </div>
        ))}
        <button className="secondary" onClick={addMenuItem}>+ 添加菜单项</button>
      </div>
    </div>
  );
}