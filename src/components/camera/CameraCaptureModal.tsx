'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  UploadCloud,
  Edit3,
  Loader2,
  CheckCircle,
  AlertCircle,
  SwitchCamera,
  Image as ImageIcon,
} from 'lucide-react';
import { PhotoEditorModal } from './PhotoEditorModal';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  folderId?: string | null;
  onUploadSuccess: () => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  familyId,
  folderId,
  onUploadSuccess,
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  // Start Camera Stream
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser. Use the native file picker.');
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
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser or use native capture.'
          : 'Unable to start camera stream. Use native capture.'
      );
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Stop camera tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Close modal and cleanup
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCapturedBlob(null);
    setIsEditorOpen(false);
    onClose();
  };

  // Shutter Click: Take snapshot from video stream
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:T]/g, '')
          .slice(0, 14);
        const defaultName = `Family_Camera_${timestamp}.jpg`;

        setCapturedBlob(blob);
        setCapturedImage(dataUrl);
        setPhotoFileName(defaultName);
        stopCamera();
      },
      'image/jpeg',
      0.95
    );
  };

  // Handle native camera capture input (mobile device camera)
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      setCapturedBlob(file);
      setPhotoFileName(file.name || `Family_Capture_${Date.now()}.jpg`);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setUploadSuccess(false);
    startCamera(facingMode);
  };

  // Toggle front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Direct Upload to Google Drive / Family Drive
  const handleDirectUpload = async () => {
    if (!capturedBlob || isUploading) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('familyId', familyId);
      if (folderId) formData.append('parentId', folderId);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('file', capturedBlob, photoFileName);

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
      }, 900);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 110 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: '680px',
            width: '95vw',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-active)',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={20} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {capturedImage ? 'Photo Captured' : 'Take Family Photo'}
              </h3>
            </div>
            <button onClick={handleClose} className="btn btn-ghost btn-sm" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>

          {/* Viewfinder or Preview Screen */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '420px',
              background: '#04070e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Live Camera Viewfinder */}
            {!capturedImage && !cameraError && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                />

                {/* Grid Overlay Guides */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gridTemplateRows: '1fr 1fr 1fr',
                    opacity: 0.25,
                  }}
                >
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                  <div style={{ borderBottom: '1px dashed #fff' }} />
                </div>

                {/* Flip Camera Button */}
                <button
                  onClick={toggleFacingMode}
                  className="btn btn-ghost btn-sm"
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 12px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                  }}
                >
                  <SwitchCamera size={16} />
                  <span>Switch</span>
                </button>
              </>
            )}

            {/* Camera Error or Fallback State */}
            {!capturedImage && cameraError && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '30px',
                  gap: '14px',
                }}
              >
                <AlertCircle size={40} style={{ color: 'var(--color-warning)' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                  {cameraError}
                </p>
                <button
                  onClick={() => fallbackInputRef.current?.click()}
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <Camera size={18} />
                  <span>Open Device Camera / Photos</span>
                </button>
              </div>
            )}

            {/* Captured Freeze Frame Preview */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Native Camera input fallback */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fallbackInputRef}
              style={{ display: 'none' }}
              onChange={handleNativeCapture}
            />
          </div>

          {/* Bottom Action Footer */}
          <div
            style={{
              padding: '18px 24px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Viewfinder Mode Controls */}
            {!capturedImage ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                {/* Fallback to phone file/camera picker */}
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  title="Use native mobile camera"
                >
                  <ImageIcon size={16} />
                  <span>Device Picker</span>
                </button>

                {/* Shutter Button (Center) */}
                <button
                  onClick={takeSnapshot}
                  className="btn"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-full)',
                    background: '#ffffff',
                    border: '4px solid var(--accent-primary)',
                    boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Click to take photo"
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent-gradient)',
                    }}
                  />
                </button>

                {/* Cancel button */}
                <button onClick={handleClose} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            ) : (
              /* Post-Capture Mode: Filename, Direct Upload & Edit Photo */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', width: '70px' }}>
                    Filename:
                  </span>
                  <input
                    type="text"
                    value={photoFileName}
                    onChange={(e) => setPhotoFileName(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', width: '70px' }}>
                    Notes:
                  </span>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional file description / notes..."
                    className="form-input"
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  {/* Retake */}
                  <button
                    onClick={handleRetake}
                    className="btn btn-secondary btn-sm"
                    disabled={isUploading}
                  >
                    <RefreshCw size={15} />
                    <span>Retake</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Option 2: Edit Photo */}
                    <button
                      onClick={() => setIsEditorOpen(true)}
                      className="btn btn-secondary btn-sm"
                      disabled={isUploading}
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Edit3 size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>Edit Photo</span>
                    </button>

                    {/* Option 1: Direct Upload */}
                    <button
                      onClick={handleDirectUpload}
                      className="btn btn-primary btn-sm"
                      disabled={isUploading || uploadSuccess}
                      style={{
                        background: uploadSuccess ? 'var(--color-success)' : 'var(--accent-gradient)',
                        boxShadow: 'var(--shadow-glow)',
                      }}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : uploadSuccess ? (
                        <>
                          <CheckCircle size={16} />
                          <span>Uploaded!</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} />
                          <span>Upload Now</span>
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

      {/* Embedded Photo Editor Modal */}
      {capturedImage && (
        <PhotoEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageUrl={capturedImage}
          initialFileName={photoFileName}
          familyId={familyId}
          folderId={folderId}
          onUploadSuccess={() => {
            setIsEditorOpen(false);
            onUploadSuccess();
            handleClose();
          }}
        />
      )}
    </>
  );
}
