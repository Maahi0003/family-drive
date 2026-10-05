# FamilyDrive ☁️👨‍👩‍👧‍👦
### Shared Google Drive Hub & Utility App for Families (Web & Android)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.20-blue.svg)](https://www.prisma.io/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](./Dockerfile)

A multi-tenant, family-oriented web and native Android application enabling families to collaborate on a dedicated Google Drive folder configured once by a Family Admin. Family members can view, upload, re-edit photos, scan multi-page documents to PDF, delete files, and create folders without needing individual Google Cloud setups or personal Google storage quotas.

---

## 🌟 Key Features in v1.0.0

1. **Zero-Setup for Family Members**:
   - Family Admin connects their Google account once via Google OAuth 2.0.
   - All other family members join via a short 6-character code (e.g. `FAM-8K4T9M`) or 1-click invite link (`/invite/FAM-8K4T9M`).
   - Members upload directly to the Admin's designated Google Drive folder.
2. **📸 Camera & Adobe Scan-Style Document Scanner**:
   - Live viewfinder with front/back camera toggling and rule-of-thirds grid.
   - Sequential multi-page capture with interactive filmstrip preview.
   - Document enhancement filters: **Magic Color** (crisp high contrast), **Clean B&W**, and **Grayscale**.
   - Zero-dependency client-side PDF engine converting page sequences into a unified **Multi-Page PDF**.
3. **🎨 Photo Editor & Post-Upload Studio**:
   - Interactive crop tool with **Freeform**, **1:1**, **4:3**, and **16:9** aspect ratio presets.
   - Creative shaders (*Vintage, Noir, Warm, Cool, Cyberpunk, Dramatic*).
   - Real-time Brightness, Contrast, and Saturation sliders.
   - Text overlays (Header Banner, Watermark, Angled Stamp) and freehand doodle brush.
   - **Post-Upload Re-Editing**: Reopen any uploaded photo to edit with dual options: *Update Original* or *Save as Copy*.
4. **📝 Descriptions & Metadata**:
   - Attach optional notes/descriptions to files during upload, scan, or post-upload edits.
   - Full persistence across SQLite/PostgreSQL Prisma schema and Google Drive file metadata.
5. **Multi-Family Switching**:
   - Create unlimited family spaces (e.g., "The Anderson Family", "Lake Tahoe Cabin Crew", "In-Laws").
   - Switch between them in one tap via the top bar or sidebar.
6. **Google Drive Root Folder Locking**:
   - Server strictly enforces that operations stay inside the Admin's selected folder ID.
   - Built-in **Sandbox / Demo Mode** enables 100% of features out-of-the-box even before Google Cloud credentials are configured.
7. **Rich File Explorer**:
   - Light and Dark mode toggle with instant theme switching.
   - Breadcrumbs navigation (`Root / Summer Vacation / Day 1`).
   - Grid View & Tabular List View modes.
   - Instant search filter by filename.
   - Drag-and-drop multi-file uploader with live progress bars.
   - In-app media lightbox: High-res images, video stream player, audio wave player, and PDF/document viewer.
   - Deletion safety with Admin-configurable member delete permissions.
8. **Developer & Admin Broadcasts**:
   - Developers/Admins can send announcements or alerts to all users or specific families.
   - Notification Bell in header with unread badge counter.
9. **In-App Self-Update Engine**:
   - Checks `/api/app/version` on launch.
   - Prompts users with release notes and 1-click direct APK download/install for Android.
10. **Cross-Platform & Deployment Ready**:
    - Modern, responsive Web App (desktop, tablet, mobile).
    - Turnkey **Docker & Docker Compose** deployment.
    - Android APK configuration (`capacitor.config.json`) with automated GitHub Actions release CI (`.github/workflows/android-build.yml`).

---

## 🚀 Quick Start (Local Development)

### 1. Requirements
- Node.js 18.x or 20.x+
- npm 9.x+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/family-drive-hub.git
cd "family-drive-hub"

# Install dependencies
npm install

# Initialize database schema
npm run prisma:push

# (Optional) Seed demo users, families, files & notifications
node prisma/seed.js
```

### 3. Running Locally
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🐳 Docker Deployment (Production)

Deploy FamilyDrive with persistent storage in one command:

```bash
# 1. Build and start containers in detached mode
docker-compose up -d --build

# 2. View logs
docker-compose logs -f

# 3. Access app at http://localhost:3000
```

To stop:
```bash
docker-compose down
```

---

## ☁️ Cloud Deployment Guides

### Option A: Vercel (Recommended for Serverless)
1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set Environment Variables:
   - `DATABASE_URL`: Your production Postgres/MySQL URL (or Supabase/Neon connection string).
   - `JWT_SECRET`: A secure 32+ character random string.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://your-familydrive.vercel.app`).
   - *(Optional)* `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Click **Deploy**.

### Option B: Netlify
1. Connect your repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set identical Environment Variables as above.

---

## 🔑 Pre-Configured Demo Accounts (Instant Testing)

Use the 1-click buttons on the login card, or enter credentials manually:

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Dad (Admin)** | `john.dad@example.com` | `password123` | Family Admin (The Anderson Family) |
| **Mom (Member)** | `sarah.mom@example.com` | `password123` | Member & Admin (Tahoe Crew) |
| **Alex (Kid)** | `alex.kid@example.com` | `password123` | Family Member |

---

## 🌐 Google Cloud Console Setup (To Connect Real Google Drive)

> **Note**: The app works 100% out of the box in Sandbox Mode with simulated Google Drive. To connect your live personal Google Drive:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `FamilyDrive-Hub`).
3. Navigate to **APIs & Services** > **Library** and enable **Google Drive API**.
4. Go to **OAuth Consent Screen**:
   - User Type: **External**
   - App Name: `FamilyDrive`
   - Scopes: Add `.../auth/drive` and `.../auth/userinfo.email`
   - Add your Gmail as a **Test User**.
5. Go to **Credentials** > **Create Credentials** > **OAuth Client ID**:
   - Application Type: **Web application**
   - Authorized Redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Copy your **Client ID** and **Client Secret** into your `.env` file:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
   ```
7. Restart the server, open **Family Settings** in the app, and click **Connect Google Account**!

---

## 📱 Android App Build (Capacitor Native APK)

1. **Build Web Assets**:
   ```bash
   npm run build
   ```
2. **Add Android Platform**:
   ```bash
   npx cap add android
   npx cap sync android
   ```
3. **Open in Android Studio & Compile**:
   ```bash
   npx cap open android
   # Click 'Build' > 'Build Bundle(s) / APK(s)' > 'Build APK(s)'
   ```
   Or push a git tag `v1.0.0` to trigger the automated GitHub Action: `.github/workflows/android-build.yml`.

---

## 📂 Project Architecture & Documentation

- [Product Requirements Document (PRD)](./docs/PRD.md)
- [UI/UX Design Specification](./docs/UI_UX_DESIGN.md)
- [File Connection Map & Architecture](./docs/FILE_CONNECTION_MAP.md)
- [REST API Documentation](./docs/API_DOCUMENTATION.md)
- [Changelog & Semantic Versioning](./CHANGELOG.md)

---

## 📄 License
MIT License. Built with ❤️ for families everywhere.
