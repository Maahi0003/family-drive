'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  HardDrive,
  Users,
  Settings,
  Activity,
  LogOut,
  Share2,
  ChevronDown,
  Cloud,
  Check,
  Copy,
  Sun,
  Moon,
} from 'lucide-react';
import { UserSession, FamilySummary } from '@/types';
import { FamilySwitcher } from './FamilySwitcher';
import { NotificationBell } from './NotificationBell';
import { UpdateModal } from '../update/UpdateModal';

interface AppShellProps {
  user: UserSession;
  families: FamilySummary[];
  activeFamily: FamilySummary | null;
  onSelectFamily: (family: FamilySummary) => void;
  onCreateFamily: () => void;
  onJoinFamily: () => void;
  onOpenSettings: () => void;
  onOpenActivity: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({
  user,
  families,
  activeFamily,
  onSelectFamily,
  onCreateFamily,
  onJoinFamily,
  onOpenSettings,
  onOpenActivity,
  onLogout,
  children,
}: AppShellProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('familydrive_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('familydrive_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    if (!activeFamily) return;
    navigator.clipboard.writeText(activeFamily.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeFamily) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/invite/${activeFamily.inviteCode}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ambient-glow" />
      <div className="ambient-glow-bottom" />

      {/* Top Navbar */}
      <header className="header">
        {/* Left: Brand + Family Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Cloud size={20} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.03em',
                  background: 'var(--brand-title-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FamilyDrive
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Shared Storage
              </span>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)' }} />

          {/* Family Switcher */}
          <FamilySwitcher
            families={families}
            activeFamily={activeFamily}
            onSelectFamily={onSelectFamily}
            onCreateFamily={onCreateFamily}
            onJoinFamily={onJoinFamily}
          />
        </div>

        {/* Right: Actions & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeFamily && (
            <>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="btn btn-secondary btn-sm"
                title="Invite family members"
              >
                <Share2 size={15} style={{ color: 'var(--accent-primary)' }} />
                <span>Invite</span>
              </button>

              <button
                onClick={onOpenActivity}
                className="btn btn-ghost btn-sm"
                title="Activity Feed"
              >
                <Activity size={16} />
              </button>

              <button
                onClick={onOpenSettings}
                className="btn btn-ghost btn-sm"
                title="Family Settings"
              >
                <Settings size={16} />
              </button>
            </>
          )}

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              color: theme === 'dark' ? '#fbbf24' : '#6366f1',
              background: 'var(--bg-surface)',
              transition: 'all 0.2s ease',
            }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Developer / System Broadcast Notifications */}
          <NotificationBell />

          {/* User Profile Avatar Dropdown */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="btn btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface-hover)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '220px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  zIndex: 50,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    color: 'var(--color-danger)',
                    marginTop: '4px',
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content-body" style={{ flex: 1 }}>
        {children}
      </main>

      {/* Quick Invite Modal */}
      {inviteModalOpen && activeFamily && (
        <div className="modal-overlay" onClick={() => setInviteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Share2 size={22} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.15rem' }}>Invite to {activeFamily.name}</h3>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Share this code or link with your family members so they can join and access shared Google Drive files:
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Invite Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={activeFamily.inviteCode}
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                  <button onClick={handleCopyCode} className="btn btn-secondary">
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">1-Click Invite Link</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={typeof window !== 'undefined' ? `${window.location.origin}/invite/${activeFamily.inviteCode}` : ''}
                  />
                  <button onClick={handleCopyLink} className="btn btn-primary">
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setInviteModalOpen(false)} className="btn btn-secondary">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* In-App Self Update Checker Modal */}
      <UpdateModal />
    </div>
  );
}
