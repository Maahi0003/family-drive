'use client';

import React, { useState } from 'react';
import { UserPlus, X, KeyRound } from 'lucide-react';

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (familyId: string) => void;
}

export function JoinFamilyModal({ isOpen, onClose, onJoined }: JoinFamilyModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join family');

      const familyId = data.family?.id || data.familyId;
      onJoined(familyId);
      setInviteCode('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={22} style={{ color: 'var(--color-success)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Join a Family Space</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'var(--color-danger-bg)', color: '#fca5a5', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Enter Invite Code</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                autoFocus
                className="form-input"
                placeholder="e.g. FAM-8K4T9M"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.1rem',
                  textAlign: 'center',
                }}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
            Ask your Family Admin for their 6-character invite code or invite link.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !inviteCode.trim()}>
              {loading ? 'Joining...' : 'Join Family'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
