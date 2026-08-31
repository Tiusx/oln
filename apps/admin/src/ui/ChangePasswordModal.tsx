import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from './Feedback';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!currentPassword) { toast('请输入当前密码', 'error'); return; }
    if (newPassword.length < 8) { toast('新密码至少 8 位', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('两次输入的新密码不一致', 'error'); return; }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast('密码修改成功，下次请使用新密码登录', 'success');
      onClose();
    } catch (e: any) {
      toast(e.message || '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pw-title">
        <div className="modal-head" id="pw-title">修改密码</div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">当前密码</label>
            <input className="field-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="请输入当前密码" autoFocus />
          </div>
          <div className="field">
            <label className="field-label">新密码</label>
            <input className="field-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 8 位" />
          </div>
          <div className="field">
            <label className="field-label">确认新密码</label>
            <input className="field-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn" onClick={submit} disabled={saving}>
            {saving ? <><span className="spinner-sm" /> 保存中…</> : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
