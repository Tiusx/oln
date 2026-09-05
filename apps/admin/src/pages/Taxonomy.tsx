import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

export default function Taxonomy() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selTags, setSelTags] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    api.listCategories().then((r) => setCategories(r.data)).catch(() => {});
    api.listTags().then((r) => {
      setTags(r.data);
      setSelTags((prev) => new Set([...prev].filter((id) => r.data.some((t: any) => t.id === id))));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addCategory() {
    if (!newCat.trim()) { toast('请输入分类名称', 'error'); return; }
    try {
      await api.createCategory({ name: newCat.trim() });
      toast('分类已添加');
      setNewCat('');
      load();
    } catch (e: any) {
      toast(e.message || '添加失败', 'error');
    }
  }
  async function addTag() {
    if (!newTag.trim()) { toast('请输入标签名称', 'error'); return; }
    try {
      await api.createTag({ name: newTag.trim() });
      toast('标签已添加');
      setNewTag('');
      load();
    } catch (e: any) {
      toast(e.message || '添加失败', 'error');
    }
  }

  async function removeCategory(id: string, name: string) {
    if (!(await confirm({ title: '删除分类', message: `确定删除分类 "${name}" 吗？`, danger: true }))) return;
    try {
      await api.deleteCategory(id);
      toast('分类已删除');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  async function removeTag(id: string, name: string) {
    if (!(await confirm({ title: '删除标签', message: `确定删除标签 "${name}" 吗？`, danger: true }))) return;
    try {
      await api.deleteTag(id);
      toast('标签已删除');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  function toggleSelTag(id: string) {
    setSelTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allTagsSelected = tags.length > 0 && tags.every((t) => selTags.has(t.id));

  function toggleSelAllTags() {
    setSelTags((prev) => {
      const next = new Set(prev);
      if (allTagsSelected) tags.forEach((t) => next.delete(t.id));
      else tags.forEach((t) => next.add(t.id));
      return next;
    });
  }

  async function batchDeleteTags() {
    const ids = Array.from(selTags);
    if (ids.length === 0) return;
    if (!(await confirm({ title: '批量删除标签', message: `确定删除选中的 ${ids.length} 个标签吗？文章上的关联标签将被移除。`, danger: true }))) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await api.deleteTag(id); ok++; } catch { fail++; }
    }
    setSelTags(new Set());
    if (fail > 0) toast(`已删除 ${ok} 个标签，失败 ${fail} 个`, 'error');
    else toast(`已删除 ${ok} 个标签`, 'success');
    load();
  }

  return (
    <div className="tax">
      <h1 className="page-title">分类 / 标签</h1>

      <div className="tax-grid">
        <section className="panel">
          <h3 className="panel-title">分类</h3>
          <div className="flex add-row">
            <input
              type="text"
              className="field-input"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="新分类名称…"
            />
            <button className="btn" onClick={addCategory}>添加</button>
          </div>
          <div className="cat-list">
            {categories.length === 0 && <div className="state-box" style={{ padding: '24px 12px' }}>还没有分类，添加一个吧～</div>}
            {categories.map((c) => (
              <div className="cat-item" key={c.id}>
                <span className="cat-name">{c.name}</span>
                <span className="cat-slug">/{c.slug}</span>
                <button className="btn ghost sm danger-text" onClick={() => removeCategory(c.id, c.name)}>删除</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title">标签</h3>
          <div className="flex add-row">
            <input
              type="text"
              className="field-input"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="新标签名称…"
            />
            <button className="btn" onClick={addTag}>添加</button>
          </div>
          <div className="flex between" style={{ marginTop: 10 }}>
            {tags.length > 0 && (
              <label className="sel-all">
                <input type="checkbox" checked={allTagsSelected} onChange={toggleSelAllTags} />
                全选标签
              </label>
            )}
            {selTags.size > 0 && (
              <button className="btn danger sm" onClick={batchDeleteTags}>删除所选标签（{selTags.size}）</button>
            )}
          </div>
          <div className="flex wrap" style={{ marginTop: 8 }}>
            {tags.length === 0 && <div className="state-box" style={{ padding: '24px 12px', width: '100%' }}>还没有标签，添加一个吧～</div>}
            {tags.map((t) => (
              <label key={t.id} className={`chip${selTags.has(t.id) ? ' on' : ''}`}>
                <input type="checkbox" checked={selTags.has(t.id)} onChange={() => toggleSelTag(t.id)} />
                #{t.name}
                <button
                  className="chip-x"
                  title={`删除 ${t.name}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTag(t.id, t.name); }}
                >×</button>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
