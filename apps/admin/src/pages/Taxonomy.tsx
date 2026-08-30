import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

export default function Taxonomy() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    api.listCategories().then((r) => setCategories(r.data)).catch(() => {});
    api.listTags().then((r) => setTags(r.data)).catch(() => {});
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
            {categories.length === 0 && <p className="muted">还没有分类，添加一个吧～</p>}
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
          <div className="flex wrap" style={{ marginTop: 6 }}>
            {tags.length === 0 && <p className="muted">还没有标签，添加一个吧～</p>}
            {tags.map((t) => (
              <span key={t.id} className="chip">
                #{t.name}
                <button className="chip-x" title={`删除 ${t.name}`} onClick={() => removeTag(t.id, t.name)}>×</button>
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
