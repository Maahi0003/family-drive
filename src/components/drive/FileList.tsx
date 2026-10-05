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
  Edit3,
} from 'lucide-react';
import { DriveItem } from '@/types';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';

interface FileListProps {
  items: DriveItem[];
  onOpenFolder: (folder: DriveItem) => void;
  onPreviewFile: (file: DriveItem) => void;
  onEditFile?: (file: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  canDelete: boolean;
}

export function FileList({
  items,
  onOpenFolder,
  onPreviewFile,
  onEditFile,
  onDelete,
  canDelete,
}: FileListProps) {
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
        return <Folder size={20} style={{ color: '#818cf8', fill: 'rgba(99, 102, 241, 0.2)' }} />;
      case 'image':
        return <ImageIcon size={20} style={{ color: '#38bdf8' }} />;
      case 'video':
        return <Video size={20} style={{ color: '#f43f5e' }} />;
      case 'audio':
        return <Music size={20} style={{ color: '#ec4899' }} />;
      case 'document':
        return <FileText size={20} style={{ color: '#34d399' }} />;
      case 'archive':
        return <Archive size={20} style={{ color: '#fbbf24' }} />;
      default:
        return <File size={20} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div style={{ overflowX: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
      <table className="file-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>Name</th>
            <th style={{ width: '15%' }}>Size</th>
            <th style={{ width: '20%' }}>Modified</th>
            <th style={{ width: '10%' }}>Uploaded By</th>
            <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => {
                if (item.isFolder) {
                  onOpenFolder(item);
                } else {
                  onPreviewFile(item);
                }
              }}
            >
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderIcon(item)}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '260px',
                        }}
                        title={item.description}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {item.isFolder ? '—' : formatBytes(item.size)}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {formatDate(item.updatedAt)}
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {item.uploaderName || 'Family Drive'}
              </td>
              <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'inline-flex', gap: '6px' }}>
                  {!item.isFolder && item.mimeType.startsWith('image/') && onEditFile && (
                    <button
                      onClick={() => onEditFile(item)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px', color: '#f472b6' }}
                      title="Edit Photo in Studio"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                  {!item.isFolder && (
                    <a
                      href={item.downloadUrl}
                      download
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px' }}
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px', color: '#f87171' }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
