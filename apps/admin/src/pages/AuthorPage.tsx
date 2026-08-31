import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

export default function AuthorPage() {
  const [author, setAuthor] = useState<any>({ name: '', avatar: '', bio: '', socials: [] });
  const { toast } = useToast();

  const load = useCallback(async () => {
    const r = await api.getConfig();
    const config = r.data;
    setAuthor(config.author || { name: '', avatar: '', bio: '', socials: [] });
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    try {
      await api.saveConfig({ author });
      toast('个人中心配置已保存', 'success');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    }
  }, []);

  return (
    <div className="author-center">
      <h1 className="page-title">个人中心</h1>

      <div className="panel">
        <div className="flex between toolbar">
          <h1 className="page-title">作者信息</h1>
          <button onClick={save} className="btn btn-primary">保存</button>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="ap-name">作者名</label>
            <input id="ap-name" type="text" className="field-input" value={author.name} readOnly />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ap-avatar">头像 URL</label>
            <input id="ap-avatar" type="text" className="field-input" value={author.avatar} readOnly />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ap-bio">简介</label>
          <input id="ap-bio" type="text" className="field-input" value={author.bio} readOnly />
        </div>
      </div>

      <h3 className="panel-title" style={{ marginTop: 16 }}>社交链接</h3>
      {author.socials.map((s: any, i: number) => (
        <div key={i} className="flex" style={{ marginBottom: 8 }}>
          <span>{s.label}: {s.url}</span>
        </div>
      ))}

      <button className="btn" onClick={() => setAuthor({ ...author, socials: [...author.socials, { label: '', url: '' }] })} style={{ marginTop: 8 }}>+ 添加社交链接</button>
    </div>
  );
}