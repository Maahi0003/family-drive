'use client';

import React from 'react';
import { ChevronRight, Folder, Home } from 'lucide-react';
import { BreadcrumbItem } from '@/types';

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ breadcrumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumb-container" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate(null)}
        className={`breadcrumb-item ${breadcrumbs.length === 1 ? 'active' : ''}`}
        style={{
          background: 'none',
          border: 'none',
          font: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Home size={16} />
        <span>Root</span>
      </button>

      {breadcrumbs.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return (
          <React.Fragment key={crumb.id || index}>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <button
              onClick={() => !isLast && onNavigate(crumb.id)}
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                font: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isLast ? 'default' : 'pointer',
              }}
            >
              <Folder size={15} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {crumb.name}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
