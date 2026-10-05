'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Shield,
  HardDrive,
  Users,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { FamilySummary, MemberItem } from '@/types';

interface FamilySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: FamilySummary | null;
  onUpdate: () => void;
}

export function FamilySettingsModal({
  isOpen,
  onClose,
  family,
  onUpdate,
}: FamilySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'drive' | 'permissions' | 'invite' | 'members'>('drive');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowMemberDelete, setAllowMemberDelete] = useState(true);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (family && isOpen) {
      setName(family.name);
      setDescription(family.description || '');
      setAllowMemberDelete(family.allowMemberDelete);
      setInviteCode(family.inviteCode);
      fetchMembers();
      fetchFullDetails();
    }
  }, [family, isOpen]);

  const fetchFullDetails = async () => {
    if (!family) return;
    try {
      const res = await fetch(`/api/families/${family.id}`);
      const data = await res.json();
      if (data.family) {
        setDriveFolderId(data.family.driveRootFolderId || '');
        setDriveFolderName(data.family.driveRootFolderName || '');
        setAllowMemberDelete(data.family.allowMemberDelete);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMembers = async () => {
    if (!family) return;
    try {
      const res = await fetch(`/api/families/${family.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !family) return null;

  const isAdmin = family.role === 'ADMIN';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerating the invite code will invalidate the old code and link. Proceed?')) return;
    try {
      setRegenerating(true);
      const res = await fetch(`/api/families/${family.id}/invite-code`, { method: 'POST' });
      const data = await res.json();
      if (data.inviteCode) {
        setInviteCode(data.inviteCode);
        setMessage({ type: 'success', text: 'Invite code regenerated successfully!' });
        onUpdate();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to regenerate code' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch(`/api/families/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          allowMemberDelete,
          driveRootFolderId: driveFolderId || null,
          driveRootFolderName: driveFolderName || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      const res = await fetch(`/api/google/auth-url?familyId=${family.id}`);
      const data = await res.json();
      if (data.configured && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(
          'Google Cloud OAuth is not yet configured in .env with GOOGLE_CLIENT_ID.\n\nRunning in local Sandbox / Demo Mode with simulated Google Drive storage.'
        );
      }
    } catch (err: any) {
      alert('Could not start Google OAuth flow: ' + err.message);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this family?`)) return;
    try {
      const res = await fetch(`/api/families/${family.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembers();
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={22} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>{family.name} Settings</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Family Admin Controls' : 'Family Details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('drive')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'drive' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'drive' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '12px 16px',
            }}
          >
            <HardDrive size={16} />
            <span>Google Drive</span>
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'invite' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'invite' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '12px 16px',
            }}
          >
            <Share2 size={16} />
            <span>Invite & Link</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'permissions' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'permissions' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '12px 16px',
            }}
          >
            <Shield size={16} />
            <span>Permissions</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'members' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'members' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '12px 16px',
            }}
          >
            <Users size={16} />
            <span>Members ({members.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '24px' }}>
          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.85rem',
                background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
              }}
            >
              {message.text}
            </div>
          )}

          {/* TAB: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Connection Status</span>
                  {family.driveConnected ? (
                    <span className="badge badge-green">Connected to Google Drive</span>
                  ) : (
                    <span className="badge badge-indigo">Active Sandbox / Demo Mode</span>
                  )}
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                  }}
                >
                  <p>
                    {family.driveConnected
                      ? 'Files and folders created by family members are stored directly in your designated Google Drive folder.'
                      : 'The app is running in Sandbox / Demo mode. All uploads, folder creations, and downloads work seamlessly. To connect a live Google account, click below.'}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleConnectGoogleDrive}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '20px' }}
                  >
                    <ExternalLink size={16} />
                    <span>{family.driveConnected ? 'Reconnect Google Account' : 'Connect Google Account via OAuth'}</span>
                  </button>
                )}
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Google Drive Target Folder ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Leave blank for Root, or paste Google Drive Folder ID"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Files will be strictly restricted within this Google Drive folder.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB: INVITE & LINK */}
          {activeTab === 'invite' && (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Family Invite Code
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    background: 'var(--bg-surface)',
                    border: '2px dashed var(--accent-primary)',
                    borderRadius: 'var(--radius-lg)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>{inviteCode}</span>
                  <button onClick={handleCopyCode} className="btn btn-primary btn-sm" title="Copy Code">
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Direct Invite Link</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteCode}` : ''}
                  />
                  <button onClick={handleCopyLink} className="btn btn-secondary">
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Family members can click this link to join directly without typing the code.
                </span>
              </div>

              {isAdmin && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={handleRegenerateCode}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-warning)' }}
                    disabled={regenerating}
                  >
                    <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                    <span>Regenerate Invite Code</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '2px' }}>
                    Allow Member Deletions
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    If disabled, only the Family Admin can delete files and folders.
                  </div>
                </div>

                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                  checked={allowMemberDelete}
                  onChange={(e) => setAllowMemberDelete(e.target.checked)}
                  disabled={!isAdmin}
                />
              </div>

              {isAdmin && (
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">Family Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: MEMBERS */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${m.role === 'ADMIN' ? 'badge-indigo' : 'badge-green'}`}>
                      {m.role}
                    </span>

                    {isAdmin && m.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, m.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px', color: 'var(--color-danger)' }}
                        title="Remove member"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Footer */}
          {isAdmin && (activeTab === 'drive' || activeTab === 'permissions') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
