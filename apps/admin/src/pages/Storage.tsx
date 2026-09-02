// apps/admin/src/pages/Storage.tsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Feedback';

interface ConfigShape {
  provider: 'local' | 'r2' | 's3' | 'github';
  r2: { region: string; endpoint: string; publicUrl: string; bucket: string; accessKeyId: string; secretAccessKey: string };
  s3: { region: string; endpoint: string; publicUrl: string; bucket: string; accessKeyId: string; secretAccessKey: string };
  github: { repo: string; path: string; branch?: string; token: string; publicUrl: string };
}

const PROVIDERS: { key: ConfigShape['provider']; label: string; hint: string }[] = [
  { key: 'r2', label: 'Cloudflare R2', hint: 'S3 对接，配置可动态修改' },
  { key: 's3', label: 'S3 兼容存储', hint: '通用 S3 API 对象存储' },
  { key: 'github', label: 'GitHub', hint: 'Contents API 对接仓库路径' },
];

const DEFAULT: ConfigShape = {
  provider: 'r2',
  r2: { region: 'auto', endpoint: '', publicUrl: '', bucket: '', accessKeyId: '', secretAccessKey: '' },
  s3: { region: 'auto', endpoint: '', publicUrl: '', bucket: '', accessKeyId: '', secretAccessKey: '' },
  github: { repo: '', path: '', branch: 'main', token: '', publicUrl: '' },
};

function validate(c: ConfigShape): string {
  if (c.provider === 'r2') {
    if (!c.r2.bucket || !c.r2.accessKeyId || !c.r2.secretAccessKey) return 'R2 配置不完整：请填写 Bucket、Access Key ID 和 Secret Access Key';
  }
  if (c.provider === 's3') {
    if (!c.s3.bucket || !c.s3.accessKeyId || !c.s3.secretAccessKey) return 'S3 配置不完整：请填写 Bucket、Access Key ID 和 Secret Access Key';
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
      setConfig({
        ...DEFAULT,
        ...r.data,
        r2: { ...DEFAULT.r2, ...(r.data as any).r2 },
        s3: { ...DEFAULT.s3, ...(r.data as any).s3 },
        github: { ...DEFAULT.github, ...(r.data as any).github },
      });
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
      const isOk = r.data.status === 'ok';
      setStatus(isOk ? 'success' : 'error');
      setMsg(r.data.message || (isOk ? '连接测试成功' : '连接测试失败'));
      toast(isOk ? '测试完成' : '连接异常', isOk ? 'success' : 'error');
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message || '连接测试失败');
      toast(e.message || '连接测试失败', 'error');
    }
  }, [config, toast]);

  const setR2 = (k: keyof ConfigShape['r2']) => (v: string) =>
    setConfig((p) => ({ ...p, r2: { ...p.r2, [k]: v } }));
  const setS3 = (k: keyof ConfigShape['s3']) => (v: string) =>
    setConfig((p) => ({ ...p, s3: { ...p.s3, [k]: v } }));
  const setGh = (k: keyof ConfigShape['github']) => (v: string) =>
    setConfig((p) => ({ ...p, github: { ...p.github, [k]: v } }));

  return (
    <div>
      <h1 className="page-title">存储配置</h1>
      <p className="muted" style={{ marginTop: 4 }}>选择资源服务提供商，配置驱动、动态生效——修改后保存即可，无需重新部署。R2 / S3 走 S3 API，GitHub 走 Contents API。</p>

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

      {config.provider === 'r2' && (
        <div className="panel">
          <h3 className="panel-title">Cloudflare R2 (S3 API)</h3>
          <p className="muted">
            对接 Cloudflare R2 桶：Region 通常为 auto，Endpoint 填写 R2 的 S3 API 根地址，公开域名填写绑定的自定义域（用于生成对外链接）。
          </p>
          <div className="field-grid">
            <div><Field label="Region" value={config.r2.region} onChange={setR2('region')} placeholder="auto" hint="R2 填 auto" /></div>
            <div><Field label="Bucket" value={config.r2.bucket} onChange={setR2('bucket')} placeholder="my-r2-bucket" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Endpoint（S3 API 根地址）" value={config.r2.endpoint} onChange={setR2('endpoint')} placeholder="https://<account-id>.r2.cloudflarestorage.com" hint="不含桶名，不含末尾 /" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="公开域名（自定义域，可选）" value={config.r2.publicUrl} onChange={setR2('publicUrl')} placeholder="https://r2.example.com" hint="绑定自定义域后填写，用于生成对外访问链接。留空则用 S3 Endpoint 拼接。" /></div>
            <div><Field label="Access Key ID" value={config.r2.accessKeyId} onChange={setR2('accessKeyId')} placeholder="R2 Access Key" /></div>
            <div><Field label="Secret Access Key" value={config.r2.secretAccessKey} onChange={setR2('secretAccessKey')} type="password" placeholder="R2 Secret Key" /></div>
          </div>
        </div>
      )}

      {config.provider === 's3' && (
        <div className="panel">
          <h3 className="panel-title">S3 兼容对象存储</h3>
          <p className="muted">
            对接任意 S3 兼容存储：填写 Region、Endpoint、Bucket 及 Access/Secret Key。如有自定义域请填写公开域名。
          </p>
          <div className="field-grid">
            <div><Field label="Region" value={config.s3.region} onChange={setS3('region')} placeholder="auto" hint="填对应区域" /></div>
            <div><Field label="Bucket" value={config.s3.bucket} onChange={setS3('bucket')} placeholder="my-bucket" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Endpoint（S3 API 根地址）" value={config.s3.endpoint} onChange={setS3('endpoint')} placeholder="https://s3.amazonaws.com" hint="不含桶名，不含末尾 /" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="公开域名（自定义域，可选）" value={config.s3.publicUrl} onChange={setS3('publicUrl')} placeholder="https://cdn.example.com" hint="绑定了自定义域时填写，用于生成对外访问链接。留空则用 S3 Endpoint 拼接。" /></div>
            <div><Field label="Access Key ID" value={config.s3.accessKeyId} onChange={setS3('accessKeyId')} placeholder="S3 Access Key" /></div>
            <div><Field label="Secret Access Key" value={config.s3.secretAccessKey} onChange={setS3('secretAccessKey')} type="password" placeholder="S3 Secret Key" /></div>
          </div>
        </div>
      )}

      {config.provider === 'github' && (
        <div className="panel">
          <h3 className="panel-title">GitHub 参数</h3>
          <p className="muted">通过 GitHub Contents API 对接仓库目录：可远程浏览、删除文件并生成 raw 链接。需拥有该仓库写入权限的 Personal Access Token。</p>
          <div className="field-grid">
            <div><Field label="Repository (owner/repo)" value={config.github.repo} onChange={setGh('repo')} placeholder="username/repo-name" /></div>
            <div><Field label="Path（仓库内根目录开始，如 medias/）" value={config.github.path} onChange={setGh('path')} placeholder="medias/" /></div>
            <div><Field label="Branch" value={config.github.branch || ''} onChange={setGh('branch')} placeholder="main" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Token (Personal Access Token)" value={config.github.token} onChange={setGh('token')} type="password" placeholder="ghp_xxxxxxxxxxxx" hint="拥有对上面仓库 Contents 写入权限的 token" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="加速域名（自定义域，可选）" value={config.github.publicUrl} onChange={setGh('publicUrl')} placeholder="https://gh-proxy.example.com" hint="用于加速 raw 资源访问，Eg. jsDelivr、jsProxy 或自建反代。留空则用 raw.githubusercontent.com。" /></div>
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
