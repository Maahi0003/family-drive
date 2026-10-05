'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Download, X, CheckCircle, Smartphone } from 'lucide-react';

interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  mandatory: boolean;
  releaseDate: string;
  downloadUrl: string;
  changelog: string[];
}

export function UpdateModal() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check version on mount
    fetch('/api/app/version?current=1.0.0')
      .then((res) => res.json())
      .then((data: VersionInfo) => {
        if (data.updateAvailable && !dismissed) {
          setVersionInfo(data);
          // Only show once per session unless mandatory
          const hasSeen = sessionStorage.getItem(`update_seen_${data.latestVersion}`);
          if (!hasSeen || data.mandatory) {
            setIsOpen(true);
          }
        }
      })
      .catch(console.error);
  }, [dismissed]);

  const handleDismiss = () => {
    if (versionInfo) {
      sessionStorage.setItem(`update_seen_${versionInfo.latestVersion}`, 'true');
    }
    setIsOpen(false);
    setDismissed(true);
  };

  if (!isOpen || !versionInfo) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--accent-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--accent-light)', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
            <span>New Version {versionInfo.latestVersion} Available</span>
          </div>

          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>
            FamilyDrive Update Ready!
          </h3>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            A new version with performance upgrades, video player support, and mobile improvements is ready to install.
          </p>

          {/* Changelog list */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              What&apos;s New in {versionInfo.latestVersion}:
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versionInfo.changelog.map((log, idx) => (
                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--color-success)', marginTop: '2px' }}>•</span>
                  <span>{log}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href={versionInfo.downloadUrl}
              className="btn btn-primary btn-lg"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDismiss}
            >
              <Download size={18} />
              <span>Download & Install APK</span>
            </a>

            {!versionInfo.mandatory && (
              <button
                type="button"
                onClick={handleDismiss}
                className="btn btn-ghost btn-sm"
              >
                Remind me later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
