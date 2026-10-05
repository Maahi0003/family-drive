'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  FlipHorizontal,
  Crop,
  Sliders,
  Sparkles,
  Brush,
  Type,
  Check,
  UploadCloud,
  Loader2,
  Undo2,
  Download,
  FileText,
  Save,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { generatePdfFromImages } from '@/lib/pdf-generator';

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialFileName?: string;
  initialDescription?: string | null;
  existingFileId?: string | null; // Set when editing an already-uploaded file
  familyId: string;
  folderId?: string | null;
  onUploadSuccess: () => void;
}

type TabType = 'filters' | 'adjust' | 'crop' | 'draw' | 'text';
type FilterType = 'none' | 'vivid' | 'warm' | 'cool' | 'bw' | 'vintage';
type AspectPreset = 'free' | '1:1' | '4:3' | '16:9';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  size: number;
}

interface CropRect {
  x: number; // percentage 0 - 100
  y: number;
  w: number;
  h: number;
}

export function PhotoEditorModal({
  isOpen,
  onClose,
  imageUrl,
  initialFileName,
  initialDescription,
  existingFileId,
  familyId,
  folderId,
  onUploadSuccess,
}: PhotoEditorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('filters');
  const [fileName, setFileName] = useState(
    initialFileName || `Family_Photo_${Date.now()}.jpg`
  );
  const [rotation, setRotation] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterType>('none');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);

  // Crop State
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free');
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [appliedCrop, setAppliedCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [cropDragHandle, setCropDragHandle] = useState<string | null>(null);

  // Text / Caption State
  const [caption, setCaption] = useState<string>('');
  const [textStyle, setTextStyle] = useState<'banner' | 'center' | 'stamp'>('banner');
  const [textColor, setTextColor] = useState<string>('#ffffff');

  // Metadata & Format
  const [description, setDescription] = useState<string>(initialDescription || '');
  const [saveFormat, setSaveFormat] = useState<'jpg' | 'png' | 'pdf'>('jpg');

  // Doodle Drawing
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#facc15');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Processing & Uploading
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const isMouseDownRef = useRef<boolean>(false);

  // Sync initial values on open or imageUrl change
  useEffect(() => {
    if (initialFileName) setFileName(initialFileName);
    if (initialDescription !== undefined) setDescription(initialDescription || '');
    setRotation(0);
    setFlipped(false);
    setFilter('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setStrokes([]);
    setCaption('');
    setCropRect({ x: 0, y: 0, w: 100, h: 100 });
    setAppliedCrop({ x: 0, y: 0, w: 100, h: 100 });
  }, [imageUrl, initialFileName, initialDescription, isOpen]);

  // Load Image Object
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageObjRef.current = img;
      renderCanvas();
    };
  }, [imageUrl]);

  // Render Full Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const naturalW = img.naturalWidth || 800;
    const naturalH = img.naturalHeight || 600;

    // Calculate crop source window in natural image pixels
    const srcX = Math.round((appliedCrop.x / 100) * naturalW);
    const srcY = Math.round((appliedCrop.y / 100) * naturalH);
    const srcW = Math.max(10, Math.round((appliedCrop.w / 100) * naturalW));
    const srcH = Math.max(10, Math.round((appliedCrop.h / 100) * naturalH));

    const isRotatedSideways = rotation % 180 !== 0;
    const outW = isRotatedSideways ? srcH : srcW;
    const outH = isRotatedSideways ? srcW : srcH;

    canvas.width = outW;
    canvas.height = outH;

    ctx.save();
    ctx.clearRect(0, 0, outW, outH);

    // Apply color filters
    let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (filter === 'vivid') filterStr += ' saturate(140%) contrast(115%)';
    if (filter === 'warm') filterStr += ' sepia(25%) saturate(120%) hue-rotate(-10deg)';
    if (filter === 'cool') filterStr += ' saturate(110%) hue-rotate(15deg)';
    if (filter === 'bw') filterStr += ' grayscale(100%) contrast(120%)';
    if (filter === 'vintage') filterStr += ' sepia(60%) contrast(95%)';

    ctx.filter = filterStr;

    // Transform coordinate space for rotation & flipping
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipped) ctx.scale(-1, 1);

    ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    // Reset filter for annotations
    ctx.filter = 'none';

    // Render strokes (doodles)
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Render Text / Caption Overlay
    if (caption.trim() !== '') {
      const text = caption.trim();

      if (textStyle === 'banner') {
        // Bottom frosted banner
        const bannerH = Math.max(50, Math.floor(outH * 0.085));
        const fontSize = Math.max(16, Math.floor(bannerH * 0.45));

        ctx.fillStyle = 'rgba(11, 15, 25, 0.75)';
        ctx.fillRect(0, outH - bannerH, outW, bannerH);

        ctx.fillStyle = textColor;
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, outW / 2, outH - bannerH / 2);
      } else if (textStyle === 'center') {
        // Centered watermark
        const fontSize = Math.max(20, Math.floor(outW * 0.06));
        ctx.save();
        ctx.font = `700 ${fontSize}px sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 8;
        ctx.fillText(text, outW / 2, outH / 2);
        ctx.restore();
      } else if (textStyle === 'stamp') {
        // Top subtle stamp
        const fontSize = Math.max(14, Math.floor(outW * 0.035));
        ctx.save();
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(text, 20, 20);
        ctx.restore();
      }
    }
  }, [
    appliedCrop,
    rotation,
    flipped,
    filter,
    brightness,
    contrast,
    saturation,
    caption,
    textStyle,
    textColor,
    strokes,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  if (!isOpen) return null;

  // Apply Crop Aspect Ratio Preset
  const setCropPreset = (preset: AspectPreset) => {
    setAspectPreset(preset);
    if (preset === 'free') {
      setCropRect({ x: 0, y: 0, w: 100, h: 100 });
      return;
    }

    const img = imageObjRef.current;
    if (!img) return;

    let targetRatio = 1;
    if (preset === '1:1') targetRatio = 1;
    if (preset === '4:3') targetRatio = 4 / 3;
    if (preset === '16:9') targetRatio = 16 / 9;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    let newW = 100;
    let newH = 100;

    if (imgRatio > targetRatio) {
      newW = Math.round((targetRatio / imgRatio) * 100);
      newH = 100;
    } else {
      newH = Math.round((imgRatio / targetRatio) * 100);
      newW = 100;
    }

    const newX = Math.round((100 - newW) / 2);
    const newY = Math.round((100 - newH) / 2);
    setCropRect({ x: newX, y: newY, w: newW, h: newH });
  };

  const applyCurrentCrop = () => {
    setAppliedCrop({ ...cropRect });
  };

  const resetCrop = () => {
    setCropRect({ x: 0, y: 0, w: 100, h: 100 });
    setAppliedCrop({ x: 0, y: 0, w: 100, h: 100 });
    setAspectPreset('free');
  };

  // Doodle Canvas Coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    isMouseDownRef.current = true;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current = [pt];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isMouseDownRef.current) return;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current.push(pt);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && currentStrokeRef.current.length > 1) {
      const pts = currentStrokeRef.current;
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingMode || !isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      setStrokes((prev) => [
        ...prev,
        {
          points: [...currentStrokeRef.current],
          color: brushColor,
          size: brushSize,
        },
      ]);
      currentStrokeRef.current = [];
    }
  };

  const undoLastStroke = () => {
    setStrokes((prev) => prev.slice(0, prev.length - 1));
  };

  // Export Output Blob
  const getExportBlob = async (targetFormat = saveFormat): Promise<{ blob: Blob; finalFileName: string; mimeType: string }> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not ready');

    const baseName = fileName.replace(/\.(jpe?g|png|pdf)$/i, '');

    if (targetFormat === 'pdf') {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const pdfBlob = await generatePdfFromImages([
        {
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        },
      ]);
      return {
        blob: pdfBlob,
        finalFileName: `${baseName}.pdf`,
        mimeType: 'application/pdf',
      };
    } else if (targetFormat === 'png') {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('PNG export failed'));
          resolve({
            blob,
            finalFileName: `${baseName}.png`,
            mimeType: 'image/png',
          });
        }, 'image/png');
      });
    } else {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('JPEG export failed'));
            resolve({
              blob,
              finalFileName: `${baseName}.jpg`,
              mimeType: 'image/jpeg',
            });
          },
          'image/jpeg',
          0.92
        );
      });
    }
  };

  // Local Download
  const handleDownloadLocally = async () => {
    try {
      setIsDownloading(true);
      const { blob, finalFileName } = await getExportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Save changes: Update Original File (PUT) OR Save as New Copy (POST)
  const handleSave = async (isUpdateOriginal = false) => {
    const canvas = canvasRef.current;
    if (!canvas || isUploading) return;

    try {
      setIsUploading(true);
      const { blob, finalFileName } = await getExportBlob();

      const formData = new FormData();
      formData.append('familyId', familyId);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (isUpdateOriginal && existingFileId) {
        // Update existing file in-place
        formData.append('name', finalFileName);
        formData.append('file', blob, finalFileName);

        const res = await fetch(`/api/drive/files/${existingFileId}`, {
          method: 'PUT',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update file');
        }
      } else {
        // Create new upload copy
        const copyName = existingFileId
          ? finalFileName.replace(/(\.[^.]+)$/, '_edited$1')
          : finalFileName;

        if (folderId) formData.append('parentId', folderId);
        formData.append('file', blob, copyName);

        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Upload failed');
        }
      }

      setIsUploading(false);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '960px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <Sparkles size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="form-input"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  maxWidth: '320px',
                }}
                title="Edit file name"
              />
              {existingFileId && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-active)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Editing Uploaded File
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio Viewport (Canvas Centered with Interactive Crop Overlay) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#04070e',
            overflow: 'hidden',
            position: 'relative',
            padding: '16px',
          }}
        >
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                cursor: isDrawingMode ? 'crosshair' : 'default',
                display: 'block',
              }}
            />

            {/* Visual Crop Box Guide Overlay (Shown when Crop Tab is active) */}
            {activeTab === 'crop' && (
              <div
                style={{
                  position: 'absolute',
                  top: `${cropRect.y}%`,
                  left: `${cropRect.x}%`,
                  width: `${cropRect.w}%`,
                  height: `${cropRect.h}%`,
                  border: '2px dashed #38bdf8',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                  pointerEvents: 'none',
                  borderRadius: '4px',
                }}
              >
                {/* Rule of Thirds Lines inside Crop Box */}
                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', opacity: 0.35 }}>
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderBottom: '1px dashed #fff' }} />
                </div>

                {/* 4 Corner Anchors */}
                <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '10px', height: '10px', background: '#38bdf8', border: '1px solid #fff' }} />
                <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: '#38bdf8', border: '1px solid #fff' }} />
                <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '10px', height: '10px', background: '#38bdf8', border: '1px solid #fff' }} />
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '10px', height: '10px', background: '#38bdf8', border: '1px solid #fff' }} />
              </div>
            )}
          </div>

          {/* Drawing Mode Banner */}
          {isDrawingMode && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: '#facc15',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Brush size={14} />
              <span>Drawing Mode Active — Click & Drag to Doodle</span>
            </div>
          )}
        </div>

        {/* Tab Controls Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Sub-panel Options Based on Active Tab */}
          <div style={{ minHeight: '48px', display: 'flex', alignItems: 'center' }}>
            {/* Filters Tab */}
            {activeTab === 'filters' && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '4px' }}>
                {(['none', 'vivid', 'warm', 'cool', 'bw', 'vintage'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="btn btn-sm"
                    style={{
                      background: filter === f ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                      color: filter === f ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Adjustments Tab */}
            {activeTab === 'adjust' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Brightness</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-primary)', width: '90px' }}
                  />
                  <span style={{ fontSize: '0.75rem', width: '30px' }}>{brightness}%</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Contrast</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-primary)', width: '90px' }}
                  />
                  <span style={{ fontSize: '0.75rem', width: '30px' }}>{contrast}%</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Saturation</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-primary)', width: '90px' }}
                  />
                  <span style={{ fontSize: '0.75rem', width: '30px' }}>{saturation}%</span>
                </div>

                <button
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Reset
                </button>
              </div>
            )}

            {/* Crop & Transform Tab */}
            {activeTab === 'crop' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', width: '100%' }}>
                {/* Aspect Presets */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(
                    [
                      { key: 'free', label: 'Full/Free' },
                      { key: '1:1', label: '1:1 Square' },
                      { key: '4:3', label: '4:3 Standard' },
                      { key: '16:9', label: '16:9 Wide' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setCropPreset(p.key)}
                      className="btn btn-sm"
                      style={{
                        background: aspectPreset === p.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: aspectPreset === p.key ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Commit / Reset Crop Buttons */}
                <button
                  onClick={applyCurrentCrop}
                  className="btn btn-sm"
                  style={{
                    background: 'var(--color-info)',
                    color: '#fff',
                    gap: '4px',
                    fontSize: '0.78rem',
                  }}
                  title="Apply Crop Box to Image"
                >
                  <Crop size={14} />
                  <span>Apply Crop</span>
                </button>

                <button
                  onClick={resetCrop}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem' }}
                  title="Reset to original dimensions"
                >
                  Reset Crop
                </button>

                <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="btn btn-secondary btn-sm"
                  title="Rotate 90 degrees"
                >
                  <RotateCw size={14} />
                  <span>Rotate</span>
                </button>

                <button
                  onClick={() => setFlipped((f) => !f)}
                  className="btn btn-secondary btn-sm"
                  title="Flip horizontally"
                >
                  <FlipHorizontal size={14} />
                  <span>Flip</span>
                </button>
              </div>
            )}

            {/* Drawing Tab */}
            {activeTab === 'draw' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className="btn btn-sm"
                  style={{
                    background: isDrawingMode ? 'var(--color-success)' : 'var(--bg-secondary)',
                    color: '#fff',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Brush size={14} />
                  <span>{isDrawingMode ? 'Doodle Active' : 'Start Doodle'}</span>
                </button>

                {/* Color swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {['#facc15', '#ef4444', '#06b6d4', '#ffffff', '#10b981', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrushColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        background: c,
                        border: brushColor === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        transform: brushColor === c ? 'scale(1.2)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  ))}
                </div>

                {strokes.length > 0 && (
                  <button onClick={undoLastStroke} className="btn btn-ghost btn-sm" title="Undo stroke">
                    <Undo2 size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Text & Caption Tab */}
            {activeTab === 'text' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Enter text / caption / title overlay..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, minWidth: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                />

                {/* Placement Options */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['banner', 'center', 'stamp'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setTextStyle(pos)}
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        textTransform: 'capitalize',
                        background: textStyle === pos ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: textStyle === pos ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                {/* Text Colors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {['#ffffff', '#facc15', '#ef4444', '#06b6d4', '#000000'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--radius-full)',
                        background: c,
                        border: textColor === c ? '2px solid var(--accent-primary)' : '1px solid #666',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>

                {caption && (
                  <button onClick={() => setCaption('')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tool Selector Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <button
              onClick={() => { setActiveTab('filters'); setIsDrawingMode(false); }}
              className="btn btn-ghost btn-sm"
              style={{
                background: activeTab === 'filters' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'filters' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Sparkles size={15} />
              <span>Filters</span>
            </button>

            <button
              onClick={() => { setActiveTab('adjust'); setIsDrawingMode(false); }}
              className="btn btn-ghost btn-sm"
              style={{
                background: activeTab === 'adjust' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'adjust' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Sliders size={15} />
              <span>Adjust</span>
            </button>

            <button
              onClick={() => { setActiveTab('crop'); setIsDrawingMode(false); }}
              className="btn btn-ghost btn-sm"
              style={{
                background: activeTab === 'crop' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'crop' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Crop size={15} />
              <span>Crop / Rotate</span>
            </button>

            <button
              onClick={() => { setActiveTab('draw'); setIsDrawingMode(true); }}
              className="btn btn-ghost btn-sm"
              style={{
                background: activeTab === 'draw' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'draw' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Brush size={15} />
              <span>Doodle</span>
            </button>

            <button
              onClick={() => { setActiveTab('text'); setIsDrawingMode(false); }}
              className="btn btn-ghost btn-sm"
              style={{
                background: activeTab === 'text' ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === 'text' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Type size={15} />
              <span>Text / Caption</span>
            </button>
          </div>

          {/* Bottom Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Format Selector & Description */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Format:</span>
                {(['jpg', 'png', 'pdf'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSaveFormat(fmt)}
                    className="btn btn-sm"
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      background: saveFormat === fmt ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                      color: saveFormat === fmt ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 600,
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Optional description / notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '180px', padding: '4px 10px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Action Buttons: Discard, Download, and Save/Update */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={isUploading}>
                Discard
              </button>

              <button
                type="button"
                onClick={handleDownloadLocally}
                className="btn btn-secondary btn-sm"
                disabled={isDownloading || isUploading}
                title="Download file to device"
              >
                <Download size={14} />
                <span>Download</span>
              </button>

              {/* If editing existing file, provide choice to Update Original or Save Copy */}
              {existingFileId ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    className="btn btn-secondary btn-sm"
                    disabled={isUploading}
                    style={{ gap: '6px' }}
                    title="Upload edited version as a new file"
                  >
                    <Copy size={14} />
                    <span>Save as Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="btn btn-primary btn-sm"
                    disabled={isUploading}
                    style={{
                      background: 'var(--accent-gradient)',
                      boxShadow: 'var(--shadow-glow)',
                      gap: '6px',
                    }}
                    title="Replace and overwrite original file"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Update Original</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleSave(false)}
                  className="btn btn-primary btn-sm"
                  disabled={isUploading}
                  style={{
                    background: 'var(--accent-gradient)',
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      <span>Save & Upload ({saveFormat.toUpperCase()})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
