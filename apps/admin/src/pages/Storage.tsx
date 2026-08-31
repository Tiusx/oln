// apps/admin/src/pages/Storage.tsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

interface StorageConfig {
  provider: 'local' | 'r2' | 'github';
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    endpoint?: string;
  };
  github: {
    repo: string;
    path: string;
    token: string;
  };
}

export default function Storage() {
  const [config, setConfig] = useState<StorageConfig>({
    provider: 'local',
    r2: { accountId: '', accessKeyId: '', secretAccessKey: '', bucketName: '', endpoint: '' },
    github: { repo: '', path: '', token: '' },
  });
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // 统一校验函数
  const validate = useCallback((c: StorageConfig) => {
    if (c.provider === 'r2') {
      if (!c.r2.accountId || !c.r2.accessKeyId || !c.r2.secretAccessKey || !c.r2.bucketName) {
        return 'Cloudflare R2 配置不完整，请填写 Account ID、Access Key、Secret Key 和 Bucket Name';
      }
    }
    if (c.provider === 'github') {
      if (!c.github.repo || !c.github.path || !c.github.token) {
        return 'GitHub 配置不完整，请填写 Repository、Path 和 Token';
      }
    }
    return '';
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await api.getStorageConfig();
      setConfig(r.data);
    } catch (e: any) {
      // 静默失败，保留默认值
    }
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
  }, [config]);

  const testConn = useCallback(async () => {
    const err = validate(config);
    if (err) { toast(err, 'error'); return; }

    setStatus('testing');
    setMsg('');
    try {
      await api.testStorageConn(config);
      setStatus('success');
      setMsg('连接测试成功');
      toast('连接测试成功', 'success');
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message || '连接测试失败');
      toast(e.message || '连接测试失败', 'error');
    }
  }, [config]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="page-title">存储配置</h1>

      <div className="panel">
        <Field label="存储提供商" value={config.provider} onChange={(v) => setConfig(p => ({ ...p, provider: v as any }))}>
          <select className="field-input">
            <option value="local">本地存储</option>
            <option value="r2">Cloudflare R2</option>
            <option value="github">GitHub Pages</option>
          </select>
        </Field>
      </div>

      {config.provider === 'r2' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Cloudflare R2 参数</h3>
          <Field label="Account ID" value={config.r2.accountId} onChange={v => setConfig(p => ({ ...p, r2: { ...p.r2, accountId: v } }))} placeholder="xxxxxxxxxxxxxxxx" />
          <Field label="Access Key ID" value={config.r2.accessKeyId} onChange={v => setConfig(p => ({ ...p, r2: { ...p.r2, accessKeyId: v } }))} placeholder="xxxxxxxxxxxxxxxx" />
          <Field label="Secret Access Key" value={config.r2.secretAccessKey} onChange={v => setConfig(p => ({ ...p, r2: { ...p.r2, secretAccessKey: v } }))} type="password" />
          <Field label="Bucket Name" value={config.r2.bucketName} onChange={v => setConfig(p => ({ ...p, r2: { ...p.r2, bucketName: v } }))} placeholder="my-bucket" />
          <Field label="Endpoint (可选)" value={config.r2.endpoint || ''} onChange={v => setConfig(p => ({ ...p, r2: { ...p.r2, endpoint: v } }))} placeholder="https://xxxx.r2.cloudflarestorage.com" />
        </div>
      )}

      {config.provider === 'github' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>GitHub Pages 参数</h3>
          <Field label="Repository (owner/repo)" value={config.github.repo} onChange={v => setConfig(p => ({ ...p, github: { ...p.github, repo: v } }))} placeholder="username/repo-name" />
          <Field label="Path" value={config.github.path} onChange={v => setConfig(p => ({ ...p, github: { ...p.github, path: v } }))} placeholder="uploads/" />
          <Field label="Token" value={config.github.token} onChange={v => setConfig(p => ({ ...p, github: { ...p.github, token: v } }))} type="password" placeholder="ghp_xxxxxxxxxxxx" />
        </div>
      )}

      <div className="flex between" style={{ marginTop: 24 }}>
        <button onClick={save} className="btn" disabled={isSaving}>{isSaving ? '保存中...' : '保存配置'}</button>
        <button onClick={testConn} className="secondary" disabled={status === 'testing'}>{status === 'testing' ? '测试中...' : '测试连接'}</button>
      </div>

      {status !== 'idle' && (
        <div className="panel" style={{ marginTop: 16, padding: 12, borderTop: '1px solid #e2e8f0' }}>
          <span className={status === 'success' ? 'muted' : 'danger'}>{msg}</span>
        </div>
      )}
    </div>
  );
}

// 修复后的 Field 组件
function Field({ label, value, onChange, children, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; children?: React.ReactNode; type?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children ? (
        // 直接渲染 children（已经包含 <select>），不再包裹
        <>{children}</>
      ) : (
        <input type={type} className="field-input" value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}