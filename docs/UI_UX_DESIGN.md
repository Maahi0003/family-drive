# UI/UX Design Specification & Guidelines
## FamilyDrive — Cross-Platform Web & Android App

---

## 1. Visual Design System & Token Hierarchy

FamilyDrive utilizes a sleek, dark-mode first, glassmorphism design language optimized for high visual delight and intuitive family collaboration.

### 1.1. Color Palette

```css
:root {
  /* Surfaces & Backgrounds */
  --bg-primary: #0b0f19;         /* Midnight Navy base */
  --bg-secondary: #111827;       /* Card & sidebar background */
  --bg-surface: #1a2234;         /* Interactive elements & inputs */
  --bg-surface-hover: #232e47;   /* Hover highlight state */
  --bg-glass: rgba(26, 34, 52, 0.75);
  --bg-glass-card: rgba(30, 41, 59, 0.65);

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-active: rgba(99, 102, 241, 0.4);
  --border-glow: rgba(99, 102, 241, 0.25);

  /* Brand Accents */
  --accent-primary: #6366f1;     /* Electric Indigo */
  --accent-hover: #4f46e5;       /* Deep Indigo */
  --accent-light: rgba(99, 102, 241, 0.15);
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --accent-gradient-subtle: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);

  /* Functional Status Colors */
  --color-success: #10b981;      /* Emerald Green */
  --color-success-bg: rgba(16, 185, 129, 0.15);
  --color-warning: #f59e0b;      /* Warm Amber */
  --color-warning-bg: rgba(245, 158, 11, 0.15);
  --color-danger: #ef4444;       /* Crimson Red */
  --color-danger-bg: rgba(239, 68, 68, 0.15);
  --color-info: #0ea5e9;         /* Sky Blue */
  --color-info-bg: rgba(14, 165, 233, 0.15);

  /* Typography Colors */
  --text-primary: #f8fafc;        /* High-contrast pure text */
  --text-secondary: #94a3b8;      /* Supporting text & labels */
  --text-muted: #64748b;          /* Metadata, hints & timestamps */
}
```

### 1.2. Light Theme Color Palette (`[data-theme="light"]`)

```css
[data-theme="light"] {
  /* Surfaces & Backgrounds */
  --bg-primary: #f8fafc;         /* Pure Slate soft base */
  --bg-secondary: #ffffff;       /* Card & sidebar clean white */
  --bg-surface: #f1f5f9;         /* Slate light interactive elements */
  --bg-surface-hover: #e2e8f0;   /* Hover highlight state */
  --bg-glass: rgba(255, 255, 255, 0.85);
  --bg-glass-card: rgba(255, 255, 255, 0.85);
  --bg-header: rgba(255, 255, 255, 0.88);

  /* Borders & Dividers */
  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-active: rgba(99, 102, 241, 0.5);
  --border-glow: rgba(99, 102, 241, 0.12);

  /* Brand Accents */
  --accent-primary: #6366f1;     /* Vibrant Indigo */
  --accent-hover: #4f46e5;
  --accent-light: rgba(99, 102, 241, 0.12);
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --brand-title-gradient: linear-gradient(135deg, #0f172a 30%, #4338ca 100%);

  /* Typography Colors (WCAG AAA / AA compliant) */
  --text-primary: #0f172a;        /* Deep slate primary text */
  --text-secondary: #475569;      /* Medium slate supporting text */
  --text-muted: #64748b;          /* Neutral slate metadata */

  /* Light Elevation Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.1);
  --shadow-glow: 0 0 24px rgba(99, 102, 241, 0.12);
}
```

### 1.3. Typography Hierarchy

- **Primary Font Family**: `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
- **Code & Invite Codes**: `JetBrains Mono`, monospace
- **Scale**:
  - `Hero Title`: 2.5rem - 3.4rem / 800 weight / -0.03em letter-spacing
  - `Section Header (H2)`: 1.5rem / 700 weight / -0.02em letter-spacing
  - `Card Header (H3)`: 1.15rem / 700 weight
  - `Body Regular`: 0.95rem / 400 weight / 1.5 line-height
  - `Caption / Meta`: 0.75rem - 0.85rem / 500 weight
  - `Invite Code Monospace`: 1.4rem / 700 weight / 0.1em tracking

### 1.4. Spacing & Elevation

- **Radius**:
  - Small: `8px` (`--radius-sm`) for badges, small buttons, tags
  - Medium: `12px` (`--radius-md`) for form controls, file cards
  - Large: `18px` (`--radius-lg`) for glass containers, toolbars
  - Extra Large: `24px` (`--radius-xl`) for modal dialogs
  - Full: `9999px` (`--radius-full`) for pills and avatars
- **Shadows**:
  - Subdued: `0 2px 8px rgba(0, 0, 0, 0.3)`
  - Elevated: `0 8px 24px rgba(0, 0, 0, 0.4)`
  - Modal: `0 16px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.25)`

---

## 2. Screen Specifications & Layouts

### 2.1. Screen 1: Auth & Onboarding
- **Center Hero**: Welcoming headline with gradient brand text.
- **Card**: Glassmorphic auth card with smooth toggle between "Sign In" and "Create Account".
- **Instant Pair Logins**: 1-click test buttons ("Sign in as Dad", "Sign in as Mom") allowing immediate pair testing.

### 2.2. Screen 2: Main Dashboard & File Explorer
- **Header**:
  - Brand identity icon + "FamilyDrive" typography.
  - Active Family Switcher dropdown with quick "Create Family" and "Join Family" options.
  - Top action group: "Invite" pill button, "Notifications" bell with unread badge, "Settings" gear, and user profile avatar.
- **Toolbar**:
  - Interactive breadcrumbs path with clickable segments (`Root / Summer 2024 / Day 1`).
  - Search bar with live autocomplete filter.
  - View mode toggle (Grid Cards vs Tabular List).
  - Action buttons: "New Folder", "Upload Files", "Refresh".
- **File Grid**:
  - Cards with color-coded format icons (Folder: Purple, Image: Blue, Video: Rose, Audio: Pink, Docs: Emerald, Archive: Amber).
  - Hover action overlay: Direct download, preview, delete.
- **File List**:
  - Clean table with columns: File Name, Size, Uploaded Date, Uploaded By, Action Buttons.

### 2.3. Screen 3: File Upload Experience
- **Desktop**: Drag-and-drop dropzone with animated dashed border and subtle glow on drag-over.
- **Mobile / Android**: Direct trigger of Android native media gallery or camera capture.
- **Progress Tracking**: List of queued files with live progress percentage, file size formatting, and status icons.

### 2.4. Screen 4: Media Lightbox Previewer
- Full viewport overlay with blurred backdrop.
- Embedded high-res image view, HTML5 video player, audio wave player, or PDF viewer.
- Bottom metadata bar showing file size, MIME type, upload timestamp, and uploader name.
- Prominent "Download File" button.

### 2.5. Screen 5: Family Settings Modal
- Tabbed layout:
  1. **Google Drive**: Connection status, "Connect Google Account via OAuth" button, target root folder ID input.
  2. **Invite & Link**: Display 6-letter code (`FAM-XXXXXX`), Copy Code, Copy Direct Link, and Regenerate Code.
  3. **Permissions**: Toggle switch for "Allow member deletions".
  4. **Members**: Roster table with roles and "Remove member" action.

### 2.6. Screen 6: Notification Center (Developer Broadcasts)
- Bell icon in header displaying an energetic ping badge when new developer or system broadcasts exist.
- Dropdown panel showing messages, severity colors (green, blue, amber), timestamps, and dismiss controls.

### 2.7. Screen 7: Self-Update Dialog (Android & Web)
- Modal appearing when `clientVersion < serverLatestVersion`.
- Displays version tag (e.g. `v1.2.0`), "What's New" changelog points.
- "Download & Install Update" button (downloads `.apk` on Android, reloads service worker on Web).

### 2.8. Screen 8: Camera Capture & Photo Editor Studio
- **Live Viewfinder**: Real-time camera feed (`getUserMedia`) with 3x3 framing grid, front/back camera switch (`SwitchCamera`), and tactile circular shutter button. Native mobile file fallback for maximum compatibility.
- **Post-Capture Screen**: Instant freeze-frame preview with filename editing and dual primary actions:
  - **Upload Now**: 1-click immediate upload to Google Drive / Family Drive.
  - **Edit Photo**: Direct transition into full editing studio.
  - **Retake**: Discards frame and reactivates camera stream.
- **In-App Photo Studio**:
  - Color filters: Vivid, Warm, Cool, B&W, Vintage.
  - Granular adjustments: Brightness, Contrast, Saturation.
  - Crop & Orientation: Square 1:1, 4:3, 16:9 widescreen, 90° rotation, horizontal flip.
  - Freehand Doodle: Canvas drawing with color palette and brush sizing.
  - Caption Watermark: Frosted banner at the bottom for family date or trip titles.
  - Cloud Export: High-efficiency JPEG encoding and direct multi-tenant upload to Google Drive.

---

## 3. Mobile & Android UX Ergonomics

1. **Touch Targets**: All interactive buttons have a minimum dimension of `44x44px` to prevent mis-clicks.
2. **Bottom Navigation & Pull-To-Refresh**: Mobile users benefit from easy thumb reachability for primary upload and search actions.
3. **Safe Area Insets**: Handled natively for notches, camera cutouts, and Android navigation bars:
   ```css
   padding-top: max(16px, env(safe-area-inset-top));
   padding-bottom: max(16px, env(safe-area-inset-bottom));
   ```
4. **Android Back Button Handling**: Hardware back button closes open modals, preview lightboxes, and dropdowns before exiting the app.

---

## 4. Accessibility (a11y)

- All form controls contain explicit `<label>` tags and descriptive placeholders.
- ARIA labels on all icon-only buttons (`aria-label="Upload files"`, `aria-label="Close dialog"`).
- Keyboard navigation: Full tab order through file grid, escape key closes all open modals.
- Contrast ratio: Minimum 4.5:1 for all body text against dark backgrounds.
