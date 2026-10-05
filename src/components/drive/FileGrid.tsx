'use client';

import React from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Download,
  Trash2,
  Eye,
  Edit3,
} from 'lucide-react';
import { DriveItem } from '@/types';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';

interface FileGridProps {
  items: DriveItem[];
  onOpenFolder: (folder: DriveItem) => void;
  onPreviewFile: (file: DriveItem) => void;
  onEditFile?: (file: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  canDelete: boolean;
}

export function FileGrid({
  items,
  onOpenFolder,
  onPreviewFile,
  onEditFile,
  onDelete,
  canDelete,
}: FileGridProps) {
  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        <Folder size={56} style={{ marginBottom: '16px', opacity: 0.3 }} />
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>This folder is empty</h3>
        <p style={{ fontSize: '0.9rem', maxWidth: '360px' }}>
          Upload files or create a new folder to get started sharing with your family.
        </p>
      </div>
    );
  }

  const renderIcon = (item: DriveItem) => {
    const category = getFileCategory(item.mimeType, item.name);
    switch (category) {
      case 'folder':
        return <Folder size={38} style={{ color: '#818cf8', fill: 'rgba(99, 102, 241, 0.2)' }} />;
      case 'image':
        return <ImageIcon size={34} style={{ color: '#38bdf8' }} />;
      case 'video':
        return <Video size={34} style={{ color: '#f43f5e' }} />;
      case 'audio':
        return <Music size={34} style={{ color: '#ec4899' }} />;
      case 'document':
        return <FileText size={34} style={{ color: '#34d399' }} />;
      case 'archive':
        return <Archive size={34} style={{ color: '#fbbf24' }} />;
      default:
        return <File size={34} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="file-grid">
      {items.map((item) => (
        <div
          key={item.id}
          className={`file-card ${item.isFolder ? 'is-folder' : ''}`}
          onClick={() => {
            if (item.isFolder) {
              onOpenFolder(item);
            } else {
              onPreviewFile(item);
            }
          }}
        >
          {/* Top action bar on hover */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              gap: '4px',
              zIndex: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!item.isFolder && item.mimeType.startsWith('image/') && onEditFile && (
              <button
                onClick={() => onEditFile(item)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px', borderRadius: '6px', color: '#f472b6' }}
                title="Edit photo in Studio (crop, filter, text, doodle)"
              >
                <Edit3 size={14} />
              </button>
            )}
            {!item.isFolder && (
              <a
                href={item.downloadUrl}
                download
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px', borderRadius: '6px' }}
                title="Download file"
              >
                <Download size={14} />
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(item)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px', borderRadius: '6px', color: '#f87171' }}
                title="Delete item"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="file-card-icon">{renderIcon(item)}</div>

          <div className="file-card-name" title={item.name}>
            {item.name}
          </div>

          {item.description && (
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '2px',
              }}
              title={item.description}
            >
              {item.description}
            </div>
          )}

          <div className="file-card-meta">
            {item.isFolder ? 'Folder' : formatBytes(item.size)}
          </div>
          <div className="file-card-meta" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
            {formatDate(item.updatedAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
