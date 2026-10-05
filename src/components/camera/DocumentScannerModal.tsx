'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  Plus,
  Trash2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  FileText,
  UploadCloud,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  SwitchCamera,
  Sparkles,
  Sliders,
  Layers,
  FileCheck,
} from 'lucide-react';
import { generatePdfFromImages, ScannedPageData } from '@/lib/pdf-generator';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  folderId?: string | null;
  onUploadSuccess: () => void;
}

export type ScanFilter = 'magic' | 'bw' | 'grayscale' | 'original';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: ScanFilter;
}

export function DocumentScannerModal({
  isOpen,
  onClose,
  familyId,
  folderId,
  onUploadSuccess,
}: DocumentScannerModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isScanningMode, setIsScanningMode] = useState<boolean>(true); // true = viewfinder active, false = reviewing pages

  // Metadata & Export Settings
  const [docTitle, setDocTitle] = useState<string>(
    `Scanned_Doc_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  );
  const [docDescription, setDocDescription] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg' | 'png'>('pdf');
  const [globalFilter, setGlobalFilter] = useState<ScanFilter>('magic');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Camera
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported by your browser. Use file/photo picker.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Scanner camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow access or select photos from your device.'
          : 'Unable to start camera stream. Use device picker.'
      );
    }
  };

  useEffect(() => {
    if (isOpen && isScanningMode) {
      startCamera(facingMode);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, isScanningMode, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  // Close & reset
  const handleClose = () => {
    stopCamera();
    setPages([]);
    setIsScanningMode(true);
    setUploadSuccess(false);
    onClose();
  };

  // Apply Document Scanner Filter (Magic Color, B&W Clean, Grayscale, Original)
  const processImageWithFilter = (
    imgSource: CanvasImageSource,
    width: number,
    height: number,
    filter: ScanFilter,
    rotation: number
  ): { dataUrl: string; outW: number; outH: number } => {
    const canvas = document.createElement('canvas');
    const isSideways = rotation % 180 !== 0;
    const outW = isSideways ? height : width;
    const outH = isSideways ? width : height;

    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', outW, outH };

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imgSource, -width / 2, -height / 2, width, height);
    ctx.restore();

    if (filter === 'original') {
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), outW, outH };
    }

    const imgData = ctx.getImageData(0, 0, outW, outH);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filter === 'bw') {
        // High-contrast clean paper threshold (whiten paper, sharpen ink)
        const threshold = 135;
        const val = gray > threshold ? 255 : Math.max(0, gray - 50);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else if (filter === 'grayscale') {
        // Smooth photocopy grayscale with slight contrast boost
        const contrast = 1.25;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const val = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else if (filter === 'magic') {
        // Magic Color: boosts contrast, sharpens text, brightens background
        const boost = 1.35;
        d[i] = Math.min(255, Math.pow(r / 255, 0.85) * 255 * boost);
        d[i + 1] = Math.min(255, Math.pow(g / 255, 0.85) * 255 * boost);
        d[i + 2] = Math.min(255, Math.pow(b / 255, 0.85) * 255 * boost);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), outW, outH };
  };

  // Capture current frame from viewfinder as a new page
  const capturePage = () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = w;
    rawCanvas.height = h;
    const ctx = rawCanvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95);

    const { dataUrl: processedUrl, outW, outH } = processImageWithFilter(
      rawCanvas,
      w,
      h,
      globalFilter,
      0
    );

    const newPage: ScannedPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      originalDataUrl: rawDataUrl,
      processedDataUrl: processedUrl,
      width: outW,
      height: outH,
      rotation: 0,
      filter: globalFilter,
    };

    setPages((prev) => {
      const next = [...prev, newPage];
      setActivePageIndex(next.length - 1);
      return next;
    });

    // Flash animation or feedback could be triggered here
  };

  // Import files / photos from disk as scanned pages
  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const { dataUrl: processedUrl, outW, outH } = processImageWithFilter(
            img,
            img.naturalWidth,
            img.naturalHeight,
            globalFilter,
            0
          );

          const newPage: ScannedPage = {
            id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            originalDataUrl: dataUrl,
            processedDataUrl: processedUrl,
            width: outW,
            height: outH,
            rotation: 0,
            filter: globalFilter,
          };

          setPages((prev) => {
            const next = [...prev, newPage];
            setActivePageIndex(next.length - 1);
            return next;
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Rotate a specific page
  const rotatePage = (pageIndex: number) => {
    const page = pages[pageIndex];
    if (!page) return;

    const nextRotation = (page.rotation + 90) % 360;
    const img = new Image();
    img.onload = () => {
      const { dataUrl: processedUrl, outW, outH } = processImageWithFilter(
        img,
        img.naturalWidth,
        img.naturalHeight,
        page.filter,
        nextRotation
      );

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === pageIndex
            ? {
                ...p,
                rotation: nextRotation,
                processedDataUrl: processedUrl,
                width: outW,
                height: outH,
              }
            : p
        )
      );
    };
    img.src = page.originalDataUrl;
  };

  // Change filter for a page (or all pages)
  const applyFilterToPage = (filter: ScanFilter, pageIndex?: number) => {
    setGlobalFilter(filter);

    setPages((prev) =>
      prev.map((page, idx) => {
        if (pageIndex !== undefined && idx !== pageIndex) return page;

        const img = new Image();
        img.src = page.originalDataUrl;
        const { dataUrl: processedUrl, outW, outH } = processImageWithFilter(
          img,
          page.width,
          page.height,
          filter,
          page.rotation
        );

        return {
          ...page,
          filter,
          processedDataUrl: processedUrl,
          width: outW,
          height: outH,
        };
      })
    );
  };

  // Delete page
  const deletePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activePageIndex >= next.length) {
        setActivePageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Move page position
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setActivePageIndex(toIndex);
  };

  // Generate Final Output Blob based on format (PDF, JPG, PNG)
  const generateExportBlob = async (): Promise<{ blob: Blob; fileName: string; mimeType: string }> => {
    const cleanTitle = (docTitle.trim() || 'Scanned_Document').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (exportFormat === 'pdf') {
      const scannedData: ScannedPageData[] = pages.map((p) => ({
        dataUrl: p.processedDataUrl,
        width: p.width,
        height: p.height,
      }));

      const pdfBlob = await generatePdfFromImages(scannedData);
      return {
        blob: pdfBlob,
        fileName: `${cleanTitle}.pdf`,
        mimeType: 'application/pdf',
      };
    } else {
      // Export current active page or page 1 as JPG or PNG
      const targetPage = pages[activePageIndex] || pages[0];
      const response = await fetch(targetPage.processedDataUrl);
      const rawBlob = await response.blob();
      const ext = exportFormat === 'png' ? 'png' : 'jpg';
      const mime = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      return {
        blob: rawBlob,
        fileName: `${cleanTitle}_p${activePageIndex + 1}.${ext}`,
        mimeType: mime,
      };
    }
  };

  // Download locally
  const handleDownloadLocally = async () => {
    if (pages.length === 0) return;
    try {
      setIsProcessing(true);
      const { blob, fileName } = await generateExportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload to Google Drive / Family Drive with optional description
  const handleUploadToDrive = async () => {
    if (pages.length === 0 || isUploading) return;

    try {
      setIsUploading(true);
      const { blob, fileName, mimeType } = await generateExportBlob();

      const formData = new FormData();
      formData.append('familyId', familyId);
      if (folderId) formData.append('parentId', folderId);
      if (docDescription.trim()) {
        formData.append('description', docDescription.trim());
      }
      formData.append('file', blob, fileName);

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess();
        handleClose();
      }, 1000);
    } catch (err: any) {
      alert('Scan upload failed: ' + err.message);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const activePage = pages[activePageIndex];

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 115 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '880px',
          width: '95vw',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                {isScanningMode ? 'Scan Document (Adobe Scan Style)' : 'Review & Export Document'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {pages.length} {pages.length === 1 ? 'Page' : 'Pages'} Captured
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {pages.length > 0 && (
              <button
                onClick={() => {
                  if (isScanningMode) {
                    stopCamera();
                    setIsScanningMode(false);
                  } else {
                    setIsScanningMode(true);
                  }
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                {isScanningMode ? (
                  <>
                    <FileCheck size={15} />
                    <span>Review ({pages.length})</span>
                  </>
                ) : (
                  <>
                    <Camera size={15} />
                    <span>+ Scan Next Page</span>
                  </>
                )}
              </button>
            )}

            <button onClick={handleClose} className="btn btn-ghost btn-sm" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport: Live Scanner Viewfinder OR Page Review Studio */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#04070e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Mode 1: Live Scanning Viewfinder */}
          {isScanningMode ? (
            <>
              {!cameraError ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                  />

                  {/* Document Framing Rectangle (CamScanner border target) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '20px',
                      border: '2px solid rgba(99, 102, 241, 0.65)',
                      borderRadius: '12px',
                      pointerEvents: 'none',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: '4px solid #6366f1', borderLeft: '4px solid #6366f1' }} />
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: '4px solid #6366f1', borderRight: '4px solid #6366f1' }} />
                    <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #6366f1', borderLeft: '4px solid #6366f1' }} />
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #6366f1', borderRight: '4px solid #6366f1' }} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        color: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      Align document inside borders
                    </div>
                  </div>

                  {/* Switch Camera */}
                  <button
                    onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                    className="btn btn-ghost btn-sm"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      borderRadius: 'var(--radius-full)',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <SwitchCamera size={15} />
                    <span>Flip</span>
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', maxWidth: '400px' }}>
                  <AlertCircle size={40} style={{ color: 'var(--color-warning)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {cameraError}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    <span>Choose Photos from Device</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Mode 2: Page Preview and Inspection */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                position: 'relative',
              }}
            >
              {activePage ? (
                <img
                  src={activePage.processedDataUrl}
                  alt={`Scanned page ${activePageIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                  }}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No pages scanned yet. Click "Scan Next Page" to start!
                </div>
              )}

              {/* Page Counter Overlay */}
              {activePage && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: '#fff',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Page {activePageIndex + 1} of {pages.length}
                </div>
              )}

              {/* Per-Page Quick Actions (Rotate, Delete) */}
              {activePage && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <button
                    onClick={() => rotatePage(activePageIndex)}
                    className="btn btn-secondary btn-sm"
                    title="Rotate this page 90°"
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  >
                    <RotateCw size={14} />
                    <span>Rotate</span>
                  </button>
                  <button
                    onClick={() => deletePage(activePageIndex)}
                    className="btn btn-ghost btn-sm"
                    title="Delete this page"
                    style={{ padding: '6px', color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hidden multi-file input fallback */}
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportFiles}
          />
        </div>

        {/* Multi-Page Filmstrip Carousel (Like Adobe Scan) */}
        {pages.length > 0 && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Pages ({pages.length}):
            </span>

            {pages.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => {
                  setActivePageIndex(idx);
                  if (isScanningMode) {
                    stopCamera();
                    setIsScanningMode(false);
                  }
                }}
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '74px',
                  borderRadius: 'var(--radius-sm)',
                  border:
                    activePageIndex === idx
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: activePageIndex === idx ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                }}
              >
                <img
                  src={p.processedDataUrl}
                  alt={`Page ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    color: '#fff',
                    padding: '1px 0',
                  }}
                >
                  {idx + 1}
                </div>
              </div>
            ))}

            {/* Quick Add Page Button in Filmstrip */}
            <button
              onClick={() => {
                setIsScanningMode(true);
              }}
              className="btn btn-ghost btn-sm"
              style={{
                width: '56px',
                height: '74px',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: 0,
                flexShrink: 0,
              }}
              title="Scan next page"
            >
              <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Add</span>
            </button>
          </div>
        )}

        {/* Bottom Controls / Filter Bar & Action Footer */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Scanning Mode Controls */}
          {isScanningMode ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {/* Import Existing Images */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={15} />
                <span>Import Images</span>
              </button>

              {/* Circular Shutter Button */}
              <button
                onClick={capturePage}
                className="btn"
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: 'var(--radius-full)',
                  background: '#ffffff',
                  border: '4px solid var(--accent-primary)',
                  boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Capture Document Page"
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-gradient)',
                  }}
                />
              </button>

              {/* Finish / Review Pages */}
              {pages.length > 0 ? (
                <button
                  onClick={() => {
                    stopCamera();
                    setIsScanningMode(false);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <FileCheck size={16} />
                  <span>Done ({pages.length})</span>
                </button>
              ) : (
                <div style={{ width: '90px' }} />
              )}
            </div>
          ) : (
            /* Review & Export Mode Controls */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Filters & Format Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {/* Document Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Enhance:
                  </span>
                  {(
                    [
                      { key: 'magic', label: 'Magic Color' },
                      { key: 'bw', label: 'B&W Clean' },
                      { key: 'grayscale', label: 'Grayscale' },
                      { key: 'original', label: 'Photo' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => applyFilterToPage(f.key)}
                      className="btn btn-sm"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        background:
                          globalFilter === f.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: globalFilter === f.key ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Save Format Selector (PDF, JPG, PNG) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Save As:
                  </span>
                  {(['pdf', 'jpg', 'png'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className="btn btn-sm"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        background:
                          exportFormat === fmt ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                        color: exportFormat === fmt ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        fontWeight: 600,
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Optional Description Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', width: '70px' }}>
                    Title:
                  </span>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                    placeholder="Document title (e.g. Health Insurance 2026)"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', width: '70px', paddingTop: '6px' }}>
                    Notes:
                  </span>
                  <textarea
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    className="form-input"
                    rows={2}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem', resize: 'none' }}
                    placeholder="Optional description / notes for this document (e.g. Policy #10842 paid via John)"
                  />
                </div>
              </div>

              {/* Page Reorder & Final Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '10px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {/* Reorder Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => movePage(activePageIndex, activePageIndex - 1)}
                    disabled={activePageIndex === 0}
                    className="btn btn-secondary btn-sm"
                    title="Move page earlier"
                  >
                    <ArrowLeft size={14} />
                    <span>Move Up</span>
                  </button>
                  <button
                    onClick={() => movePage(activePageIndex, activePageIndex + 1)}
                    disabled={activePageIndex === pages.length - 1}
                    className="btn btn-secondary btn-sm"
                    title="Move page later"
                  >
                    <span>Move Down</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Local Download & Drive Upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleDownloadLocally}
                    className="btn btn-secondary btn-sm"
                    disabled={pages.length === 0 || isProcessing || isUploading}
                  >
                    <Download size={15} />
                    <span>Download {exportFormat.toUpperCase()}</span>
                  </button>

                  <button
                    onClick={handleUploadToDrive}
                    className="btn btn-primary btn-sm"
                    disabled={pages.length === 0 || isUploading || uploadSuccess}
                    style={{
                      background: uploadSuccess ? 'var(--color-success)' : 'var(--accent-gradient)',
                      boxShadow: 'var(--shadow-glow)',
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Uploading Document...</span>
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Uploaded to Drive!</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        <span>Save & Upload to Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
