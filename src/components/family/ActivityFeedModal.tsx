'use client';

import React, { useState, useEffect } from 'react';
import { Activity, X, UploadCloud, FolderPlus, Trash2, UserPlus, Sliders, Clock, Loader2 } from 'lucide-react';
import { ActivityItem } from '@/types';
import { formatDate } from '@/lib/utils';

interface ActivityFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

export function ActivityFeedModal({ isOpen, onClose, familyId }: ActivityFeedModalProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && familyId) {
      setLoading(true);
      fetch(`/api/families/${familyId}/activities`)
        .then((res) => res.json())
        .then((data) => setActivities(data.activities || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, familyId]);

  if (!isOpen) return null;

  const renderActionIcon = (action: string) => {
    switch (action) {
      case 'UPLOAD':
        return <UploadCloud size={16} style={{ color: 'var(--accent-primary)' }} />;
      case 'CREATE_FOLDER':
        return <FolderPlus size={16} style={{ color: '#38bdf8' }} />;
      case 'DELETE':
        return <Trash2 size={16} style={{ color: 'var(--color-danger)' }} />;
      case 'JOIN':
        return <UserPlus size={16} style={{ color: 'var(--color-success)' }} />;
      case 'SETTINGS_UPDATE':
        return <Sliders size={16} style={{ color: '#fbbf24' }} />;
      default:
        return <Activity size={16} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Family Activity Log</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', maxHeight: '450px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          ) : activities.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
              No recent activity recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                    }}
                  >
                    {renderActionIcon(act.action)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      <strong>{act.userName}</strong>: {act.targetName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <Clock size={12} />
                      <span>{formatDate(act.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
