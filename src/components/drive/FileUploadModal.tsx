'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle, File, Loader2, Camera, FileText } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  folderId?: string | null;
  onUploadSuccess: () => void;
  onOpenCamera?: () => void;
  onOpenScanner?: () => void;
}

interface UploadQueueItem {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function FileUploadModal({
  isOpen,
  onClose,
  familyId,
  folderId,
  onUploadSuccess,
  onOpenCamera,
  onOpenScanner,
}: FileUploadModalProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [description, setDescription] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadQueueItem[] = Array.from(files).map((f) => ({
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const startUpload = async () => {
    if (queue.length === 0 || isUploading) return;
    setIsUploading(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'completed') continue;

      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'uploading', progress: 20 } : item
        )
      );

      try {
        const formData = new FormData();
        formData.append('familyId', familyId);
        if (folderId) formData.append('parentId', folderId);
        if (description.trim()) {
          formData.append('description', description.trim());
        }
        formData.append('file', queue[i].file);

        // Upload to server
        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Upload failed');
        }

        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed', progress: 100 } : item
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: err.message } : item
          )
        );
      }
    }

    setIsUploading(false);
    onUploadSuccess();
  };

  const removeQueueItem = (index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UploadCloud size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Upload to Family Drive</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} disabled={isUploading}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Dropzone */}
          <div
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <UploadCloud size={44} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
            <h4 style={{ marginBottom: '6px' }}>Click to browse or drag and drop files here</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Photos, documents, videos, music, PDFs up to 500MB
            </p>
          </div>

          {/* Camera & Scanner Quick Options */}
          {(onOpenCamera || onOpenScanner) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 12px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  OR CAPTURE / SCAN
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: onOpenCamera && onOpenScanner ? '1fr 1fr' : '1fr', gap: '10px' }}>
                {onOpenCamera && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCamera();
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                      borderColor: 'rgba(236, 72, 153, 0.35)',
                      color: '#f472b6',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    <Camera size={16} />
                    <span>Camera Photo</span>
                  </button>
                )}

                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenScanner();
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(14, 165, 233, 0.12) 100%)',
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    <FileText size={16} />
                    <span>Scan Document</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Queue List */}
          {queue.length > 0 && (
            <div style={{ marginTop: '20px', maxHeight: '220px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Files ({queue.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {queue.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <File size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.file.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatBytes(item.file.size)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                      {item.status === 'uploading' && (
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                      )}
                      {item.status === 'completed' && (
                        <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                      )}
                      {item.status === 'error' && (
                        <span title={item.error} style={{ display: 'flex', alignItems: 'center', color: 'var(--color-danger)' }}>
                          <AlertCircle size={16} />
                        </span>
                      )}
                      {item.status === 'pending' && !isUploading && (
                        <button
                          onClick={() => removeQueueItem(idx)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Description Input */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              File Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Vacation tickets, Medical bill, Home repair invoice..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '7px 12px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isUploading}>
              Close
            </button>
            <button
              type="button"
              onClick={startUpload}
              className="btn btn-primary"
              disabled={queue.length === 0 || isUploading || queue.every((i) => i.status === 'completed')}
            >
              {isUploading ? 'Uploading...' : `Upload ${queue.length > 0 ? `(${queue.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
