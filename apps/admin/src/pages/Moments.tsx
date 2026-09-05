import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';
import MarkdownEditor from '../ui/MarkdownEditor';

export default function Moments() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [composing, setComposing] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async (p = 1) => {
    try {
      const res = await api.listMoments({
        page: String(p),
        limit: '20',
      });
      setItems(res.data.items);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch {}
  }, []);
  useEffect(() => { load(page); }, [load, page]);

  async function publish() {
    if (!newContent.trim()) {
      toast('请先写点什么～', 'error');
      return;
    }
    try {
      await api.createMoment({ content: newContent, status: 'published', pinned: newPinned });
      toast('已发布', 'success');
      setComposing(false);
      setNewContent('');
      setNewPinned(false);
      setPage(1);
      load(1);
    } catch (e: any) {
      toast(e.message || '发布失败', 'error');
    }
  }

  return (
    <div className="pages">
      <div className="flex between toolbar pages-head">
        <h1 className="page-title">动态（朋友圈 / 说说）</h1>
        <button className="btn" onClick={() => setComposing(!composing)}>{composing ? '取消' : '+ 发一条'}</button>
      </div>

      {composing && (
        <section className="panel add-page-panel">
          <div className="editor-field">
            <label className="editor-label">内容（Markdown，支持图片）</label>
            <MarkdownEditor value={newContent} onChange={setNewContent} minHeight={120} />
          </div>
          <div className="flex" style={{ marginTop: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <label className="flex" style={{ gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={newPinned} onChange={(e) => setNewPinned(e.target.checked)} />
              置顶
            </label>
            <div className="flex" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={() => setComposing(false)}>取消</button>
              <button className="btn" onClick={publish}>发布</button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        {items.length === 0 && <div className="state-box">还没有动态，右上角「发一条」开始～</div>}
        <div className="page-list">
          {items.map((m) => (
            <MomentRow
              key={m.id}
              moment={m}
              onSaved={(p) => { if (p && p !== page) setPage(p); else load(page); }}
            />
          ))}
        </div>
        {total > 0 && (
          <div className="flex between" style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
            <span>共 {total} 条</span>
            <div className="flex" style={{ gap: 14 }}>
              {page > 1 && (
                <a href="#" className="link" onClick={(e) => { e.preventDefault(); setPage(page - 1); }}>上一页</a>
              )}
              {page * 20 < total && (
                <a href="#" className="link" onClick={(e) => { e.preventDefault(); setPage(page + 1); }}>下一页</a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function stripMd(s: string): string {
  return s.replace(/[#>*`\[\]!]|!\[.*?\]\(.*?\)|<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(-2)}-${`0${d.getDate()}`.slice(-2)} ${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}`;
}

function MomentRow({ moment, onSaved }: { moment: any; onSaved: (page?: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(moment.content ?? '');
  const [pinned, setPinned] = useState(!!moment.pinned);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  async function save() {
    try {
      await api.updateMoment(moment.id, { content, pinned, status: moment.status });
      toast('已保存', 'success');
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }

  async function toggleStatus() {
    const next = moment.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateMomentStatus(moment.id, next);
      toast(next === 'published' ? '已发布' : '已下架', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message || '操作失败', 'error');
    }
  }

  async function togglePin() {
    try {
      await api.updateMoment(moment.id, { content: moment.content, pinned: !moment.pinned, status: moment.status });
      toast(moment.pinned ? '已取消置顶' : '已置顶', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message || '操作失败', 'error');
    }
  }

  async function remove() {
    if (!(await confirm({ title: '删除动态', message: '确定删除这条动态吗？不可恢复。', danger: true }))) return;
    try {
      await api.deleteMoment(moment.id);
      toast('已删除', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  if (!editing) {
    return (
      <div className="page-row">
        <div className="page-row-main">
          <div className="page-row-meta">
            {moment.pinned && <span className="pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>置顶</span>}
            {moment.status === 'published' ? <span className="pill ok">已发布</span> : <span className="pill warn">草稿</span>}
            <span>{fmtDate(moment.createdAt)}</span>
          </div>
          <div className="moment-preview">{stripMd(moment.content) || '（空内容）'}</div>
        </div>
        <div className="page-row-actions">
          {moment.status === 'published'
            ? <button className="btn sm ghost" onClick={toggleStatus}>下架</button>
            : <button className="btn sm" onClick={toggleStatus}>发布</button>}
          <button className="btn sm ghost" onClick={togglePin}>{moment.pinned ? '取消置顶' : '置顶'}</button>
          <button className="btn sm ghost" onClick={() => setEditing(true)}>编辑</button>
          <button className="btn danger sm" onClick={remove}>删除</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-row editing">
      <div className="editor-field">
        <label className="editor-label">内容（Markdown）</label>
        <MarkdownEditor value={content} onChange={setContent} minHeight={160} />
      </div>
      <div className="flex" style={{ marginTop: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <label className="flex" style={{ gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          置顶
        </label>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={() => setEditing(false)}>取消</button>
          <button className="btn" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}