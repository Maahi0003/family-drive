# Changelog

All notable changes to the **FamilyDrive** application are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-05 — First Official Production Release 🚀

### 📸 Camera & In-App Scanner Studio
- **Live Camera Viewfinder**: Front and rear camera switching with 3x3 rule-of-thirds grid overlay, native capture fallback, and flash preview.
- **Adobe Scan-Style Multi-Page Document Scanner**:
  - Sequential page captures with dynamic filmstrip view.
  - Page reordering, 90° rotation, and deletion controls.
  - Document contrast enhancement filters: **Magic Color** (high-contrast clarity), **Clean B&W** (thresholded document binarization), and **Grayscale**.
  - Multi-format output: save individual pages as **JPG/PNG** or combine all pages into a unified **Multi-Page PDF**.
- **Zero-Dependency Native PDF Generator**: Lightweight client-side standard PDF-1.4 generation engine (`src/lib/pdf-generator.ts`) supporting multi-page high-resolution JPEG streams with zero external dependencies.

### 🎨 Creative Photo Editor & Post-Upload Studio
- **Visual Crop Tool**: Interactive draggable cropping frame with aspect ratio locks (**Freeform**, **1:1 Square**, **4:3 Photo**, **16:9 Landscape/Story**).
- **Pro Shaders & Filters**: Real-time canvas filters including *Original, Vintage Sepia, Noir Monochrome, Warm Sunset, Cool Emerald, Cyberpunk, and Dramatic High-Contrast*.
- **Fine Adjustment Sliders**: Live brightness, contrast, and saturation controls.
- **Text & Stamp Overlays**: Customizable text overlay styles (**Header Banner**, **Semi-Transparent Watermark**, **Angled Stamp**) with hex color picker.
- **Freehand Doodle Canvas**: Interactive brush with dynamic stroke sizing and color selection.
- **Post-Upload Re-Editing**: Reopen any existing uploaded photo directly from File Preview Lightbox, Grid, or List with two save modes:
  - **Update Original**: In-place overwrite preserving Google Drive ID and file history.
  - **Save as Copy**: Auto-appends `_edited` tag to spawn a new version.

### 📝 Descriptions & Metadata
- **Optional File Descriptions**: Add notes/captions during upload, direct camera snap, scanner save, or photo studio re-editing.
- **Full Data Persistence**: Persisted across SQLite/PostgreSQL Prisma schema (`VirtualDriveFile.description`) and synced to Google Drive file metadata.
- **Explorer Visibility**: Displayed in file preview lightboxes, grid card hover states, and details lists.

### 📁 Multi-Family Cloud Storage & Explorer
- **Google Drive Admin Delegation**:
  - Single-click OAuth 2.0 flow for Family Admins with secure server-side token rotation.
  - Scoped strictly to designated Family Root Folder ID for absolute privacy.
  - Automatic zero-config **Local Sandbox Virtual Drive** fallback when Google credentials are not set.
- **Family Workspaces & Invites**:
  - Multiple family spaces per user with instant workspace switching.
  - 6-character short invite codes (e.g. `FAM-8K4T9M`) and 1-click invite URLs.
  - Role-based permissions (`ADMIN`, `MEMBER`) with granular delete permissions toggle (`allowMemberDelete`).
- **Modern Explorer Interface**:
  - Seamless Dark and Light theme toggle with local preference persistence.
  - Grid View (interactive cards with quick actions) & List View (compact sortable table).
  - Breadcrumb navigation, subfolder creation, and drag-and-drop batch uploaders.
  - Real-time Activity Feed logging every upload, folder creation, and family join event.

### 🔒 Enterprise-Grade Security
- **Authentication**: Email/password registration salted with `bcryptjs` (cost factor 10).
- **Session Protection**: HTTP-Only, SameSite=Lax JWT tokens with 30-day persistence.
- **Zero Secret Leaks**: Sanitized `.gitignore` protecting `.env`, OAuth tokens, credentials JSON, and database files.
- **Safe Proxying**: File streams proxied server-side to prevent exposing raw storage tokens or direct Drive keys to client browsers.

### 🚀 Turnkey Deployment & Multi-Platform
- **Docker Ready**: Production multi-stage `Dockerfile` and `docker-compose.yml` for 1-command deployment.
- **Android APK CI/CD**: Pre-configured GitHub Actions workflow (`android-build.yml`) utilizing Capacitor for automated APK packaging upon tag push.
- **Vercel / Netlify Native**: Standard Next.js 14 App Router ready for zero-config cloud deployments.
