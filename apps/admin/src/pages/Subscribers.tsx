import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast, useConfirm } from '../ui/Feedback';

export default function Subscribers() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    api.listSubscribers(q).then((r) => setItems(r.data)).catch(() => {});
  }, [q]);
  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!(await confirm({ title: '删除订阅者', message: '确定删除该订阅者吗？', danger: true }))) return;
    try {
      await api.deleteSubscriber(id);
      toast('订阅者已删除');
      load();
    } catch (e: any) {
      toast(e.message || '删除失败', 'error');
    }
  }

  return (
    <div>
      <h1 className="page-title">订阅者</h1>
      <div className="panel toolbar">
        <input className="field-input" type="text" placeholder="搜索邮箱或姓名" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>邮箱</th><th>姓名</th><th>状态</th><th>订阅时间</th><th></th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{s.name || '-'}</td>
                <td><span className={`badge ${s.status === 'active' ? 'published' : 'draft'}`}>{s.status === 'active' ? '已订阅' : '已退订'}</span></td>
                <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
                <td style={{ textAlign: 'right' }}><button className="btn danger sm" onClick={() => remove(s.id)}>删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <p className="muted flex" style={{ marginTop: 12 }}>暂无订阅者。</p>}
    </div>
  );
}
