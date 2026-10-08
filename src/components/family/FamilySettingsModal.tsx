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
  Upload,
  Key,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Unlink,
  ChevronDown,
  ChevronUp,
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

  // Client-Side Google Drive Credentials State
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [uploadedJsonName, setUploadedJsonName] = useState('');
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    if (family && isOpen) {
      setName(family.name);
      setDescription(family.description || '');
      setAllowMemberDelete(family.allowMemberDelete);
      setInviteCode(family.inviteCode);
      setDriveEmail(family.driveEmail || '');
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
        setDriveEmail(data.family.driveEmail || '');
      }

      // Check Google OAuth configuration status
      const authRes = await fetch(`/api/google/auth-url?familyId=${family.id}`);
      const authData = await authRes.json();
      setDriveConfigured(Boolean(authData.configured));
      setRedirectUri(
        authData.redirectUri ||
          (typeof window !== 'undefined' ? `${window.location.origin}/api/google/callback` : '')
      );
      setHasCustomCredentials(Boolean(authData.hasCustomCredentials));
      if (authData.clientId) {
        setClientId(authData.clientId);
      }
    } catch (e) {
      console.error('Fetch full details error:', e);
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

  const handleCopyRedirectUri = () => {
    const uri = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/google/callback` : '');
    navigator.clipboard.writeText(uri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2000);
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

  // Upload client_secret.json handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedJsonName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSavingCredentials(true);
        setMessage(null);
        const rawContent = evt.target?.result as string;

        const res = await fetch('/api/google/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId: family.id,
            jsonContent: rawContent,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse and save credentials');
        }

        setDriveConfigured(true);
        setHasCustomCredentials(true);
        if (data.clientId) setClientId(data.clientId);
        setMessage({
          type: 'success',
          text: `Success! Loaded credentials from "${file.name}". You can now connect your Google Account below!`,
        });
        onUpdate();
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setSavingCredentials(false);
      }
    };
    reader.readAsText(file);
  };

  // Save manual client ID & secret handler
  const handleSaveManualCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setMessage({ type: 'error', text: 'Please enter both Client ID and Client Secret' });
      return;
    }

    try {
      setSavingCredentials(true);
      setMessage(null);
      const res = await fetch('/api/google/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: family.id,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');

      setDriveConfigured(true);
      setHasCustomCredentials(true);
      setMessage({
        type: 'success',
        text: 'Google credentials saved successfully! Click "Connect Google Account" to authorize.',
      });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingCredentials(false);
    }
  };

  // Connect via OAuth
  const handleConnectGoogleDrive = async () => {
    try {
      const res = await fetch(`/api/google/auth-url?familyId=${family.id}`);
      const data = await res.json();
      if (data.configured && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setShowManualInputs(true);
        setMessage({
          type: 'error',
          text: 'Google OAuth credentials not configured yet. Upload your client_secret.json or enter credentials below.',
        });
      }
    } catch (err: any) {
      alert('Could not start Google OAuth flow: ' + err.message);
    }
  };

  // Disconnect Google Drive
  const handleDisconnectGoogleDrive = async () => {
    if (!confirm('Disconnecting will remove Google Drive sync for this family and revert back to Sandbox / Demo mode. Continue?')) {
      return;
    }

    try {
      setDisconnectingDrive(true);
      setMessage(null);
      const res = await fetch(`/api/google/credentials?familyId=${family.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to disconnect');

      setDriveConfigured(false);
      setHasCustomCredentials(false);
      setDriveEmail('');
      setMessage({ type: 'success', text: 'Google Drive disconnected. Now running in Sandbox mode.' });
      onUpdate();
      fetchFullDetails();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDisconnectingDrive(false);
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
              {/* Connection Status Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Connection Status</span>
                  {family.driveConnected ? (
                    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      Connected to Google Drive
                    </span>
                  ) : (
                    <span className="badge badge-indigo">
                      {driveConfigured ? 'Ready to Connect' : 'Active Sandbox / Demo Mode'}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                  {family.driveConnected ? (
                    <>
                      Files and folders uploaded by family members are stored directly in your personal Google Drive account.
                      {driveEmail && (
                        <span style={{ display: 'block', marginTop: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Connected Account: {driveEmail}
                        </span>
                      )}
                    </>
                  ) : (
                    'The app is currently running in local Sandbox / Demo Mode. All files and folders work seamlessly. Connect your Google account below to sync real files directly to your Google Drive.'
                  )}
                </p>

                {isAdmin && family.driveConnected && (
                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleConnectGoogleDrive}
                      className="btn btn-secondary btn-sm"
                    >
                      <ExternalLink size={14} />
                      <span>Reconnect</span>
                    </button>
                    <button
                      onClick={handleDisconnectGoogleDrive}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      disabled={disconnectingDrive}
                    >
                      <Unlink size={14} />
                      <span>{disconnectingDrive ? 'Disconnecting...' : 'Disconnect Google Account'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ACTION: Connect Google Account via OAuth */}
              {isAdmin && !family.driveConnected && (
                <div style={{ marginBottom: '22px' }}>
                  <button
                    onClick={handleConnectGoogleDrive}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 600 }}
                  >
                    <ExternalLink size={18} />
                    <span>Connect Google Account via OAuth</span>
                  </button>
                </div>
              )}

              {/* CLIENT-SIDE SETUP: Upload Credentials JSON or Enter Keys */}
              {isAdmin && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Google Cloud OAuth Credentials
                      </span>
                    </div>
                    {hasCustomCredentials && (
                      <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                        Configured
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                    Simply drop the <code style={{ color: 'var(--accent-primary)' }}>client_secret_xxx.json</code> file you downloaded from Google Cloud Console, or enter your Client ID & Secret directly.
                  </p>

                  {/* 1-Click Upload JSON Button */}
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      htmlFor="google-json-upload"
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: '1px dashed var(--accent-primary)',
                      }}
                    >
                      <Upload size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>
                        {uploadedJsonName ? `Uploaded: ${uploadedJsonName}` : 'Upload client_secret.json'}
                      </span>
                    </label>
                    <input
                      id="google-json-upload"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Toggle Manual Entry */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowManualInputs(!showManualInputs)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{showManualInputs ? 'Hide Manual Inputs' : 'Or enter Client ID & Secret manually'}</span>
                      {showManualInputs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showManualInputs && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Client ID</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="xxx.apps.googleusercontent.com"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            style={{ fontSize: '0.82rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Client Secret</label>
                          <input
                            type="password"
                            className="form-input"
                            placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            style={{ fontSize: '0.82rem' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveManualCredentials}
                          className="btn btn-primary btn-sm"
                          disabled={savingCredentials}
                          style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        >
                          {savingCredentials ? 'Saving...' : 'Save Credentials'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Authorized Redirect URI Helper Box */}
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '10px 12px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Authorized Redirect URI in Google Cloud Console:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRedirectUri}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem', height: 'auto' }}
                      >
                        {copiedRedirectUri ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedRedirectUri ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <code
                      style={{
                        display: 'block',
                        wordBreak: 'break-all',
                        color: 'var(--accent-primary)',
                        padding: '4px 6px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                      }}
                    >
                      {redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/google/callback` : '')}
                    </code>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Add this exact URL in Google Console &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client IDs.
                    </span>
                  </div>

                  {/* Collapsible 2-Minute Setup Guide */}
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '4px 6px',
                        fontSize: '0.78rem',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Info size={13} />
                      <span>{showSetupGuide ? 'Hide 2-Minute Google Setup Guide' : 'How to get client_secret.json in 2 minutes (Quick Guide)'}</span>
                      {showSetupGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showSetupGuide && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '12px 14px',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.5',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li>
                            Open <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>console.cloud.google.com</a> and create a project (e.g. <i>"Family Drive"</i>).
                          </li>
                          <li>
                            Go to <b>APIs &amp; Services &gt; Library</b>, search for <b>Google Drive API</b> and click <b>Enable</b>.
                          </li>
                          <li>
                            Under <b>APIs &amp; Services &gt; Credentials</b>, click <b>+ Create Credentials &gt; OAuth client ID</b>.
                            <br />
                            Select <i>Web application</i>, and in <b>Authorized redirect URIs</b>, paste the copyable URL shown right above.
                          </li>
                          <li>
                            Click <b>Create</b>, then click <b>Download JSON</b> (or copy the Client ID &amp; Secret).
                          </li>
                          <li>
                            Upload that downloaded file using the <b>Upload client_secret.json</b> button above, then click <b>Connect Google Account via OAuth</b>. That&apos;s all!
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Folder ID */}
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
