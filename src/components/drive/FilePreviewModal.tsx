'use client';

import React from 'react';
import { X, Download, FileText, Calendar, HardDrive, User, Edit3 } from 'lucide-react';
import { DriveItem } from '@/types';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';

interface FilePreviewModalProps {
  item: DriveItem | null;
  onClose: () => void;
  onEdit?: (item: DriveItem) => void;
}

export function FilePreviewModal({ item, onClose, onEdit }: FilePreviewModalProps) {
  if (!item) return null;

  const category = getFileCategory(item.mimeType, item.name);
  const inlineUrl = `${item.downloadUrl}&inline=true`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '820px', width: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <FileText size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <h3
              style={{
                fontSize: '1.05rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.name}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {category === 'image' && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                  borderColor: 'rgba(236, 72, 153, 0.35)',
                  color: '#f472b6',
                  gap: '6px',
                }}
                title="Edit this image (filters, crop, text, doodle)"
              >
                <Edit3 size={15} />
                <span>Edit Photo</span>
              </button>
            )}

            <a
              href={item.downloadUrl}
              download
              className="btn btn-secondary btn-sm"
            >
              <Download size={15} />
              <span>Download</span>
            </a>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview Viewport */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            minHeight: '340px',
            maxHeight: '520px',
            overflow: 'auto',
          }}
        >
          {category === 'image' && (
            <img
              src={inlineUrl}
              alt={item.name}
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
          )}

          {category === 'video' && (
            <video
              src={inlineUrl}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '460px',
                borderRadius: 'var(--radius-md)',
              }}
            />
          )}

          {category === 'audio' && (
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', padding: '40px 0' }}>
              <audio src={inlineUrl} controls style={{ width: '100%' }} />
            </div>
          )}

          {category === 'document' && (
            <div style={{ width: '100%', height: '480px' }}>
              <iframe
                src={inlineUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                }}
                title={item.name}
              />
            </div>
          )}

          {category !== 'image' && category !== 'video' && category !== 'audio' && category !== 'document' && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Preview not available for this file type</p>
              <a
                href={item.downloadUrl}
                download
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                <Download size={16} />
                <span>Download to view</span>
              </a>
            </div>
          )}
        </div>

        {/* Optional Description */}
        {item.description && (
          <div
            style={{
              padding: '12px 24px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                textTransform: 'uppercase',
                padding: '2px 6px',
                background: 'var(--accent-light)',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
              }}
            >
              Note
            </span>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {item.description}
            </p>
          </div>
        )}

        {/* Footer Meta */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={15} />
              {formatBytes(item.size)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} />
              {formatDate(item.updatedAt)}
            </span>
            {item.uploaderName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} />
                {item.uploaderName}
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {item.mimeType}
          </span>
        </div>
      </div>
    </div>
  );
}
