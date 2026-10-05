'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { CreateFamilyModal } from '@/components/family/CreateFamilyModal';
import { JoinFamilyModal } from '@/components/family/JoinFamilyModal';
import { FamilySettingsModal } from '@/components/family/FamilySettingsModal';
import { ActivityFeedModal } from '@/components/family/ActivityFeedModal';
import { AuthCard } from '@/components/auth/AuthCard';
import { UserSession, FamilySummary } from '@/types';
import { Plus, UserPlus, Cloud, Users, Shield, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [activeFamily, setActiveFamily] = useState<FamilySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [isJoinFamilyOpen, setIsJoinFamilyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Check authentication session
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await fetchFamilies();
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFamilies = async (preferFamilyId?: string) => {
    try {
      const res = await fetch('/api/families');
      const data = await res.json();
      const famList: FamilySummary[] = data.families || [];
      setFamilies(famList);

      if (famList.length > 0) {
        if (preferFamilyId) {
          const found = famList.find((f) => f.id === preferFamilyId);
          if (found) {
            setActiveFamily(found);
            return;
          }
        }

        // Try restoring from localStorage or select first
        const savedId = localStorage.getItem('family_drive_active_id');
        const restored = famList.find((f) => f.id === savedId);
        setActiveFamily(restored || famList[0]);
      } else {
        setActiveFamily(null);
      }
    } catch (err) {
      console.error('Error fetching families:', err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSelectFamily = (fam: FamilySummary) => {
    setActiveFamily(fam);
    localStorage.setItem('family_drive_active_id', fam.id);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFamilies([]);
    setActiveFamily(null);
    localStorage.removeItem('family_drive_active_id');
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

  // Not logged in: Show landing & auth page
  if (!user) {
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

        <div style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '48px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent-light)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              <Sparkles size={15} />
              <span>Dedicated Family Cloud Storage Utility</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: '18px',
              }}
            >
              All your family memories in one{' '}
              <span
                style={{
                  background: 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Google Drive
              </span>{' '}
              space.
            </h1>

            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Family Admin connects the Drive folder. Everyone joins instantly via invite code or link to view, upload photos & documents, create folders, and collaborate seamlessly.
            </p>
          </div>

          <AuthCard
            onSuccess={async (newUser) => {
              setUser(newUser);
              await fetchFamilies();
            }}
          />
        </div>
      </div>
    );
  }

  // Logged in: Render AppShell
  return (
    <AppShell
      user={user}
      families={families}
      activeFamily={activeFamily}
      onSelectFamily={handleSelectFamily}
      onCreateFamily={() => setIsCreateFamilyOpen(true)}
      onJoinFamily={() => setIsJoinFamilyOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenActivity={() => setIsActivityOpen(true)}
      onLogout={handleLogout}
    >
      {families.length === 0 ? (
        // Empty state: User has no families yet
        <div
          style={{
            maxWidth: '560px',
            margin: '60px auto',
            textAlign: 'center',
            padding: '48px 32px',
          }}
          className="glass-card"
        >
          <div
            style={{
              width: '64px',
              height: '64px',
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

          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Welcome, {user.name}!</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
            You haven&apos;t joined any family space yet. You can create a new family as an Admin, or join an existing family using an invite code.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setIsCreateFamilyOpen(true)}
              className="btn btn-primary btn-lg"
            >
              <Plus size={18} />
              <span>Create a New Family</span>
            </button>

            <button
              onClick={() => setIsJoinFamilyOpen(true)}
              className="btn btn-secondary btn-lg"
            >
              <UserPlus size={18} />
              <span>Join with Invite Code</span>
            </button>
          </div>
        </div>
      ) : activeFamily ? (
        // Active family files explorer
        <FileExplorer
          key={activeFamily.id}
          family={activeFamily}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : null}

      {/* Family Modals */}
      <CreateFamilyModal
        isOpen={isCreateFamilyOpen}
        onClose={() => setIsCreateFamilyOpen(false)}
        onCreated={async (newId) => {
          await fetchFamilies(newId);
        }}
      />

      <JoinFamilyModal
        isOpen={isJoinFamilyOpen}
        onClose={() => setIsJoinFamilyOpen(false)}
        onJoined={async (joinedId) => {
          await fetchFamilies(joinedId);
        }}
      />

      <FamilySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        family={activeFamily}
        onUpdate={() => fetchFamilies(activeFamily?.id)}
      />

      {activeFamily && (
        <ActivityFeedModal
          isOpen={isActivityOpen}
          onClose={() => setIsActivityOpen(false)}
          familyId={activeFamily.id}
        />
      )}
    </AppShell>
  );
}
