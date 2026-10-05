'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  FolderPlus,
  UploadCloud,
  RefreshCw,
  HardDrive,
  Users,
  ShieldAlert,
  Loader2,
  Camera,
  FileText,
} from 'lucide-react';
import { DriveItem, FamilySummary, BreadcrumbItem } from '@/types';
import { Breadcrumbs } from './Breadcrumbs';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { NewFolderModal } from './NewFolderModal';
import { FileUploadModal } from './FileUploadModal';
import { FilePreviewModal } from './FilePreviewModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { DocumentScannerModal } from '../camera/DocumentScannerModal';
import { PhotoEditorModal } from '../camera/PhotoEditorModal';

interface FileExplorerProps {
  family: FamilySummary;
  onOpenSettings: () => void;
}

export function FileExplorer({ family, onOpenSettings }: FileExplorerProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: family.driveRootFolderName || 'Family Drive' },
  ]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [fileToEdit, setFileToEdit] = useState<DriveItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DriveItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = useCallback(async (folderId: string | null) => {
    try {
      setLoading(true);
      const url = folderId
        ? `/api/drive/files?familyId=${family.id}&folderId=${folderId}`
        : `/api/drive/files?familyId=${family.id}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [family.id]);

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [fetchFiles, currentFolderId]);

  const handleOpenFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: family.driveRootFolderName || 'Family Drive' }]);
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
  };

  const handleCreateFolder = async (name: string) => {
    const res = await fetch('/api/drive/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyId: family.id,
        name,
        parentId: currentFolderId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create folder');
    }
    fetchFiles(currentFolderId);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/drive/files/${itemToDelete.id}?familyId=${family.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete item');
      }
      setItemToDelete(null);
      fetchFiles(currentFolderId);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items by search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const canDelete = family.role === 'ADMIN' || family.allowMemberDelete;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner if not connected to Google Drive */}
      {!family.driveConnected && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient-subtle)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HardDrive size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Currently in <strong>Sandbox Mode</strong>. All files & folders are saved locally. Connect your Google account anytime!
            </span>
          </div>
          {family.role === 'ADMIN' && (
            <button onClick={onOpenSettings} className="btn btn-primary btn-sm">
              Connect Google Drive
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-secondary)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleNavigateBreadcrumb} />

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search files..."
              className="form-input"
              style={{
                paddingLeft: '34px',
                paddingTop: '8px',
                paddingBottom: '8px',
                fontSize: '0.85rem',
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '6px 8px',
                background: viewMode === 'grid' ? 'var(--bg-surface-hover)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '6px 8px',
                background: viewMode === 'list' ? 'var(--bg-surface-hover)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchFiles(currentFolderId)}
            className="btn btn-secondary btn-sm"
            title="Refresh Files"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* New Folder Button */}
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="btn btn-secondary btn-sm"
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>

          {/* Camera Button */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
              borderColor: 'rgba(236, 72, 153, 0.35)',
              color: '#f472b6',
            }}
            title="Take a photo with camera and edit before upload"
          >
            <Camera size={16} />
            <span>Camera</span>
          </button>

          {/* Document Scanner (Adobe Scan Style) */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
              borderColor: 'rgba(14, 165, 233, 0.35)',
              color: 'var(--color-info)',
            }}
            title="Scan multi-page documents like Adobe Scan into PDF"
          >
            <FileText size={16} />
            <span>Scan Doc</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            <UploadCloud size={16} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Main File Explorer Viewport */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
          }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : viewMode === 'grid' ? (
        <FileGrid
          items={filteredItems}
          onOpenFolder={handleOpenFolder}
          onPreviewFile={(file) => setPreviewItem(file)}
          onEditFile={(file) => setFileToEdit(file)}
          onDelete={(item) => setItemToDelete(item)}
          canDelete={canDelete}
        />
      ) : (
        <FileList
          items={filteredItems}
          onOpenFolder={handleOpenFolder}
          onPreviewFile={(file) => setPreviewItem(file)}
          onEditFile={(file) => setFileToEdit(file)}
          onDelete={(item) => setItemToDelete(item)}
          canDelete={canDelete}
        />
      )}

      {/* Modals */}
      <NewFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={handleCreateFolder}
      />

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        familyId={family.id}
        folderId={currentFolderId}
        onUploadSuccess={() => fetchFiles(currentFolderId)}
        onOpenCamera={() => setIsCameraOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        familyId={family.id}
        folderId={currentFolderId}
        onUploadSuccess={() => fetchFiles(currentFolderId)}
      />

      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        familyId={family.id}
        folderId={currentFolderId}
        onUploadSuccess={() => fetchFiles(currentFolderId)}
      />

      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onEdit={(item) => setFileToEdit(item)}
      />

      {/* Photo Studio Editor for existing uploaded files */}
      {fileToEdit && (
        <PhotoEditorModal
          isOpen={Boolean(fileToEdit)}
          onClose={() => setFileToEdit(null)}
          imageUrl={`${fileToEdit.downloadUrl}&inline=true`}
          initialFileName={fileToEdit.name}
          initialDescription={fileToEdit.description}
          existingFileId={fileToEdit.id}
          familyId={family.id}
          folderId={currentFolderId}
          onUploadSuccess={() => {
            setFileToEdit(null);
            fetchFiles(currentFolderId);
          }}
        />
      )}

      <DeleteConfirmModal
        item={itemToDelete}
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteItem}
        loading={isDeleting}
      />
    </div>
  );
}
