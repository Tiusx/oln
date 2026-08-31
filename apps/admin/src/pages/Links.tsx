import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

export default function Links() {
  const [links, setLinks] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', url: '', description: '', avatar: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    api.listLinks().then((r) => setLinks(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm({ name: '', url: '', description: '', avatar: '' });
    setEditingId(null);
  }

  async function submit() {
    if (!form.name || !form.url) {
      toast('请填写名称和 URL', 'error');
      return;
    }
    const data = { name: form.name, url: form.url, description: form.description || null, avatar: form.avatar || null };
    try {
      if (editingId) {
        await api.updateLink(editingId, data);
        toast('友链已更新', 'success');
      } else {
        await api.createLink(data);
        toast('友链已添加', 'success');
      }
      resetForm();
      load();
    } catch (e: any) {
      toast(e.message || (editingId ? '更新失败' : '添加失败'), 'error');
    }
  }

  function startEdit(l: any) {
    setEditingId(l.id);
    setForm({ name: l.name || '', url: l.url || '', description: l.description || '', avatar: l.avatar || '' });
  }

  async function remove(id: string) {
    if (!(await confirm({ title: '删除友链', message: '确定删除该友链吗？', danger: true }))) return;
    try {
      await api.deleteLink(id);
      if (editingId === id) resetForm();
      toast('友链已删除', 'success');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  return (
    <div className="links">
      <div className="flex between toolbar">
        <h1 className="page-title">友链</h1>
      </div>

      <section className="panel">
        <h3 className="panel-title">{editingId ? '编辑友链' : '添加友链'}</h3>
        <div className="link-form">
          <div className="link-form-row">
            <div className="editor-field">
              <label className="editor-label">名称</label>
              <input className="editor-input" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="站点名称" />
            </div>
            <div className="editor-field">
              <label className="editor-label">URL</label>
              <input className="editor-input" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div className="link-form-row">
            <div className="editor-field">
              <label className="editor-label">描述</label>
              <input className="editor-input" type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="一句话介绍" />
            </div>
            <div className="editor-field">
              <label className="editor-label">头像 URL</label>
              <input className="editor-input" type="text" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://…/avatar.png" />
            </div>
          </div>
          <div className="link-form-actions">
            {editingId ? (
              <>
                <button className="btn" onClick={submit}>保存修改</button>
                <button className="btn secondary" onClick={resetForm}>取消</button>
              </>
            ) : (
              <button className="btn btn-add" onClick={submit}>＋ 添加友链</button>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">友链列表</h3>
        {links.length === 0 && <div className="state-box">还没有友链，添加一个吧～</div>}
        <div className="link-list">
          {links.map((l) => (
            <div className="link-card" key={l.id} style={{ opacity: editingId === l.id ? 0.6 : 1 }}>
              {l.avatar ? <img className="link-avatar" src={l.avatar} alt="" loading="lazy" /> : <div className="link-avatar placeholder">{l.name?.charAt(0) || '?'}</div>}
              <div className="link-info">
                <a className="link-name" href={l.url} target="_blank" rel="noopener noreferrer">{l.name}</a>
                <span className="link-desc">{l.description || l.url}</span>
              </div>
              <button className="btn ghost sm danger-text" onClick={() => remove(l.id)}>删除</button>
              <button className="btn ghost sm" onClick={() => startEdit(l)}>编辑</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
