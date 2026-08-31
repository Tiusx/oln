// apps/admin/src/pages/Storage.tsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

interface ConfigShape {
  provider: 'local' | 'r2' | 'github';
  r2: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string; endpoint?: string };
  github: { repo: string; path: string; token: string };
}

const PROVIDERS: { key: ConfigShape['provider']; label: string; hint: string }[] = [
  { key: 'local', label: '本地存储', hint: '使用当前部署的 Cloudflare R2 (MEDIA) 桶' },
  { key: 'r2', label: 'Cloudflare R2', hint: '对接自有 R2 桶（当前仅保存配置）' },
  { key: 'github', label: 'GitHub', hint: '对接 GitHub 仓库路径（当前仅保存配置）' },
];

const DEFAULT: ConfigShape = {
  provider: 'local',
  r2: { accountId: '', accessKeyId: '', secretAccessKey: '', bucketName: '', endpoint: '' },
  github: { repo: '', path: '', token: '' },
};

function validate(c: ConfigShape): string {
  if (c.provider === 'r2') {
    if (!c.r2.accountId || !c.r2.accessKeyId || !c.r2.secretAccessKey || !c.r2.bucketName) {
      return 'R2 配置不完整，请填写 Account ID、Access Key、Secret Key 和 Bucket Name';
    }
  }
  if (c.provider === 'github') {
    if (!c.github.repo || !c.github.token) return 'GitHub 配置不完整，请填写 Repository 和 Token';
  }
  return '';
}

function Field({ label, value, onChange, type = 'text', placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input type={type} className="field-input" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export default function Storage() {
  const [config, setConfig] = useState<ConfigShape>(DEFAULT);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const r = await api.getStorageConfig();
      setConfig({ ...DEFAULT, ...r.data });
    } catch { /* 静默：保留默认值 */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    const err = validate(config);
    if (err) { toast(err, 'error'); return; }
    setIsSaving(true);
    try {
      await api.saveStorageConfig(config);
      toast('存储配置已保存', 'success');
      load();
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [config, load, toast]);

  const testConn = useCallback(async () => {
    const err = validate(config);
    if (err) { toast(err, 'error'); return; }
    setStatus('testing');
    setMsg('');
    try {
      const r = await api.testStorageConn(config);
      setStatus('success');
      setMsg(r.data.message || '连接测试成功');
      toast('测试完成', 'success');
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message || '连接测试失败');
      toast(e.message || '连接测试失败', 'error');
    }
  }, [config, toast]);

  const setR2 = (k: keyof ConfigShape['r2']) => (v: string) =>
    setConfig((p) => ({ ...p, r2: { ...p.r2, [k]: v } }));
  const setGh = (k: keyof ConfigShape['github']) => (v: string) =>
    setConfig((p) => ({ ...p, github: { ...p.github, [k]: v } }));

  return (
    <div>
      <h1 className="page-title">存储配置</h1>
      <p className="muted" style={{ marginTop: 4 }}>选择资源服务提供商，并对应当前所需的连接参数。本地存储立即可用；第三方存储当前仅保存配置。</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="provider-nav" role="tablist" aria-label="存储提供商">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={config.provider === p.key}
              className={`provider-tab ${config.provider === p.key ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, provider: p.key }))}
            >
              <span className="provider-name">{p.label}</span>
              <span className="provider-desc">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {config.provider === 'local' && (
        <div className="panel">
          <h3 className="panel-title">本地存储</h3>
          <p className="muted">资源将存储在当前部署的 Cloudflare R2 (MEDIA) 桶中，无需额外参数，可直接在「资源库」浏览、上传与删除。</p>
        </div>
      )}

      {config.provider === 'r2' && (
        <div className="panel">
          <h3 className="panel-title">Cloudflare R2 参数</h3>
          <div className="field-grid">
            <div><Field label="Account ID" value={config.r2.accountId} onChange={setR2('accountId')} placeholder="xxxxxxxxxxxxxxxx" hint="Cloudflare Dashboard 中的 Account ID" /></div>
            <div><Field label="Bucket Name" value={config.r2.bucketName} onChange={setR2('bucketName')} placeholder="my-bucket" /></div>
            <div><Field label="Access Key ID" value={config.r2.accessKeyId} onChange={setR2('accessKeyId')} placeholder="R2 API Token Access Key" /></div>
            <div><Field label="Secret Access Key" value={config.r2.secretAccessKey} onChange={setR2('secretAccessKey')} type="password" placeholder="R2 API Token Secret Key" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Endpoint (可选)" value={config.r2.endpoint || ''} onChange={setR2('endpoint')} placeholder="https://<account>.r2.cloudflarestorage.com" /></div>
          </div>
        </div>
      )}

      {config.provider === 'github' && (
        <div className="panel">
          <h3 className="panel-title">GitHub 参数</h3>
          <div className="field-grid">
            <div><Field label="Repository (owner/repo)" value={config.github.repo} onChange={setGh('repo')} placeholder="username/repo-name" /></div>
            <div><Field label="Path" value={config.github.path} onChange={setGh('path')} placeholder="uploads/" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Token (Personal Access Token)" value={config.github.token} onChange={setGh('token')} type="password" placeholder="ghp_xxxxxxxxxxxx" hint="拥有对上面仓库 Contents 写入权限的 token" /></div>
          </div>
        </div>
      )}

      <div className="flex between" style={{ marginTop: 24 }}>
        <button onClick={save} className="btn" disabled={isSaving}>{isSaving ? '保存中…' : '保存配置'}</button>
        <button onClick={testConn} className="secondary" disabled={status === 'testing'}>
          {status === 'testing' ? '测试中…' : '测试连接'}
        </button>
      </div>

      {status !== 'idle' && (
        <div className={`panel status-box ${status === 'success' ? 'status-ok' : 'status-err'}`} style={{ marginTop: 16, padding: 14 }}>
          <span>{msg}</span>
        </div>
      )}
    </div>
  );
}
