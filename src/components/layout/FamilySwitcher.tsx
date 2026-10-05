'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  UserPlus,
  Check,
  Users,
  Shield,
  Home,
} from 'lucide-react';
import { FamilySummary } from '@/types';

interface FamilySwitcherProps {
  families: FamilySummary[];
  activeFamily: FamilySummary | null;
  onSelectFamily: (family: FamilySummary) => void;
  onCreateFamily: () => void;
  onJoinFamily: () => void;
}

export function FamilySwitcher({
  families,
  activeFamily,
  onSelectFamily,
  onCreateFamily,
  onJoinFamily,
}: FamilySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          {activeFamily ? activeFamily.name.charAt(0).toUpperCase() : 'F'}
        </div>

        <div style={{ textAlign: 'left', minWidth: '110px', maxWidth: '160px' }}>
          <div
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--text-primary)',
            }}
          >
            {activeFamily ? activeFamily.name : 'Select Family'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {activeFamily ? `${activeFamily.memberCount} members` : 'No family'}
          </div>
        </div>

        <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '260px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '8px',
            zIndex: 50,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '6px 10px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            My Families ({families.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {families.map((fam) => {
              const isActive = activeFamily?.id === fam.id;
              return (
                <button
                  key={fam.id}
                  onClick={() => {
                    onSelectFamily(fam);
                    setIsOpen(false);
                  }}
                  className="btn btn-ghost"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--bg-surface)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {fam.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: isActive ? 600 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                      >
                        {fam.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {fam.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '8px 0 4px', paddingTop: '4px' }}>
            <button
              onClick={() => {
                onCreateFamily();
                setIsOpen(false);
              }}
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)' }}
            >
              <Plus size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Create New Family</span>
            </button>

            <button
              onClick={() => {
                onJoinFamily();
                setIsOpen(false);
              }}
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)' }}
            >
              <UserPlus size={16} style={{ color: 'var(--color-success)' }} />
              <span>Join with Invite Code</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
