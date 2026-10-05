'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { UserSession } from '@/types';
import { Cloud, Users, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!code) return;
    try {
      setJoining(true);
      setError('');

      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join family');

      const familyId = data.family?.id || data.familyId;
      if (familyId) {
        localStorage.setItem('family_drive_active_id', familyId);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)',
      }}
    >
      <div className="ambient-glow" />
      <div className="ambient-glow-bottom" />

      <div style={{ width: '100%', maxWidth: '520px', zIndex: 1 }}>
        {user ? (
          // Logged in: show 1-click join confirmation
          <div className="glass-card" style={{ padding: '36px 32px', textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--accent-light)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Users size={32} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '16px' }}>
              <Sparkles size={14} />
              <span>Family Invitation</span>
            </div>

            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
              You&apos;ve Been Invited!
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              You are invited to join the family space with code{' '}
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {code}
              </strong>
              . As a member, you can access and upload shared Google Drive files.
            </p>

            {error && (
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            {success ? (
              <div
                style={{
                  background: 'var(--color-success-bg)',
                  color: '#6ee7b7',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={20} />
                <span>Joined successfully! Redirecting...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleJoin}
                  className="btn btn-primary btn-lg"
                  disabled={joining}
                >
                  {joining ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Joining Family...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept & Join Family</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="btn btn-ghost btn-sm"
                  disabled={joining}
                >
                  Cancel and return home
                </button>
              </div>
            )}
          </div>
        ) : (
          // Not logged in: Show AuthCard with inviteCode banner
          <AuthCard
            inviteCode={code}
            onSuccess={async (newUser) => {
              setUser(newUser);
              await handleJoin();
            }}
          />
        )}
      </div>
    </div>
  );
}
