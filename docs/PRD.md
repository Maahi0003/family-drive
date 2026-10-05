# Product Requirements Document (PRD)
## FamilyDrive — Shared Google Drive Utility (Web & Android App)

- **Product Name:** FamilyDrive
- **Document Version:** 1.0.0
- **Status:** Approved / In Implementation
- **Platforms:** Web (Responsive Desktop & Mobile PWA) & Android (APK/AAB via Capacitor)
- **Target Launch:** Q4 2026

---

## 1. Executive Summary

**FamilyDrive** is a specialized, multi-tenant utility application designed for families to collaboratively store, organize, view, upload, and manage files inside a designated Google Drive folder configured once by a Family Admin.

Traditional Google Drive sharing is cumbersome for non-technical family members (grandparents, parents, children) who struggle with Google Cloud permissions, complex folder sharing settings, or personal Google storage limits. FamilyDrive solves this with:
1. **Zero-Setup for Family Members**: A Family Admin connects their Google account once. Members join via a simple 6-character code or 1-click invite link without needing their own Google Drive quota or API credentials.
2. **Multi-Family Spaces**: Users can create multiple families (e.g. "Immediate Family", "Vacation Crew", "In-Laws") and switch between them in one tap.
3. **Cross-Platform Experience**: Available as both a web application and a native Android app with built-in camera/photo picker access.
4. **Developer Broadcast System**: Developers/admins can send in-app announcements, maintenance alerts, or holiday greetings to all users.
5. **In-App Self-Update**: Android users receive update prompts and can install new APKs directly within the app without relying solely on app store delays.

---

## 2. Target Audience & User Personas

### Persona 1: "Tech-Savvy Admin" (e.g., Dad / Sibling)
- **Needs**: Wants one central, safe place for family memories and important documents. Has sufficient Google Drive storage (e.g. Google One 2TB) and wants to designate a specific folder.
- **Pain Points**: Family members accidentally delete files or fail to upload photos because Drive sharing links are confusing.
- **Goals**: Connects Google Drive once, controls who can delete files, shares easy invite codes, monitors activity.

### Persona 2: "Non-Technical Family Member" (e.g., Mom / Grandparent)
- **Needs**: Wants to see photos of the grandkids, upload recent holiday photos from their Android phone, and view tax documents without logging into complex Google accounts.
- **Pain Points**: Forgets passwords, gets lost in Google Drive's complex hierarchy.
- **Goals**: Clicks invite link on WhatsApp, enters name, takes photo or chooses from gallery, taps Upload.

### Persona 3: "Active Teen / Young Adult" (e.g., College Student / Kid)
- **Needs**: Belongs to multiple families/groups (Immediate family, cousins group, college housemates).
- **Goals**: Easily switches between family spaces on mobile or laptop, downloads documents, uploads high-res trip videos.

---

## 3. Platform Architecture

| Platform | Technology | Deployment |
| :--- | :--- | :--- |
| **Web App** | Next.js 14 (App Router), React 18, Vanilla CSS Design System | Vercel / Node Server / Docker |
| **Android App** | Capacitor Native Shell + Next.js Hybrid Web, Android SDK 34+ | Direct APK / Play Store AAB |
| **Backend & APIs** | Next.js API Routes (Node.js runtime), JWT Auth, Googleapis v3 | Embedded Serverless / Node |
| **Database** | SQLite + Prisma ORM (Zero-dependency, persistent file db) | Local disk / Cloud volume |
| **Cloud Storage** | Google Drive API v3 (Scoped to Admin's root folder ID) | Admin's Google Drive |
| **Local Sandbox** | Built-in Virtual Drive provider for instant demo testing | In-app SQLite storage |

---

## 4. Key Functional Specifications

### 4.1. Authentication & Session Management
- **Local Credentials**: Email and password registration/login with bcryptjs password hashing (10 salt rounds).
- **Session Security**: Stateless, secure HTTP-only JWT cookies (30-day persistence) verified via `jose`.
- **Instant Pair-Testing Logins**: Pre-configured demo logins ("Dad - Admin", "Mom - Member") for testing multi-user flows in development.

### 4.2. Multi-Family & Membership Management
- **Family Creation**: Any user can create a family space. Creator is automatically designated as `ADMIN` and owner.
- **Invite Engine**:
  - Unique 6-character alphanumeric code generated per family (e.g., `FAM-7K9P2X`).
  - Direct 1-click URL (`https://[domain]/invite/FAM-7K9P2X`).
  - Admin can regenerate the invite code at any time, immediately invalidating old codes.
- **Multi-Family Switching**:
  - Header and sidebar dropdown selector showing all active family spaces.
  - Active family preference persisted in `localStorage`.
- **Member Roster & Permissions**:
  - Roster view displaying member names, emails, roles, and join dates.
  - Admin can remove members or transfer ownership.
  - Admin can toggle `allowMemberDelete` (default: true).

### 4.3. Google Drive Integration & Boundary Security
- **OAuth 2.0 Authorization**:
  - Admin clicks "Connect Google Drive" in Family Settings.
  - Generates authorization URL with scopes `drive.file` / `drive` and `userinfo.email`.
  - Exchanges code for refresh token; securely saved to SQLite database.
- **Folder Boundary Enforcement**:
  - Admin enters or picks a target Google Drive Folder ID.
  - Server proxies all requests and enforces that operations (`list`, `create`, `upload`, `delete`) never escape the root folder or its subdirectories.
- **Sandbox Fallback Mode**:
  - If Google Cloud credentials are not yet configured in `.env`, the app functions 100% locally with simulated folder structures, file uploads, previews, and downloads.

### 4.4. File Explorer & Operations
- **Navigation**:
  - Interactive breadcrumbs navigation (`Family Root / Vacation / Day 1`).
  - Real-time search filter by filename.
  - Toggle between Grid Card View and Tabular List View.
- **Upload Engine**:
  - Drag-and-drop dropzone with visual hover feedback.
  - Multi-file queue with progress percentage, file size formatting, and error handling.
  - Direct mobile camera/gallery access via native file picker on Android.
- **Folder Creation**: "New Folder" dialog directly creates subfolders in Google Drive.
- **File Preview Lightbox**:
  - High-res image display.
  - Video stream player with controls.
  - Audio player with scrubber.
  - PDF & document viewer via iframe/stream.
  - File metadata (size, upload timestamp, uploader name, MIME type).
- **File Actions**:
  - Direct download stream (`/api/drive/download/[id]`).
  - Delete with safety confirmation modal (checks `allowMemberDelete` permission).

### 4.5. Developer-Sent Broadcast Notifications
- **Developer / Admin Announcement API**:
  - `POST /api/admin/broadcast`: Allows system developer or designated admin to broadcast alerts (e.g. "Scheduled Maintenance at 10 PM", "New Feature: Audio Player!").
  - Can target **ALL** users, or a specific family space.
- **Notification Center UI**:
  - Bell icon in navbar with badge count for unread notifications.
  - Interactive dropdown tray showing title, message, timestamp, and severity (`info`, `warning`, `success`).
  - Mark as read / dismiss actions.

### 4.6. Android Self-Update Engine
- **Version Check API**:
  - `GET /api/app/version`: Returns current server version, minimal required version, release notes, and APK download link (`https://.../releases/familydrive-latest.apk`).
- **In-App Update Modal**:
  - On app launch, compares client version with server version.
  - If a newer version exists, displays a "What's New" modal with a "Download & Install Update" button.
  - On Android: downloads APK and initiates Android package installer intent.
  - On Web: prompts to refresh the browser cache to load the latest build.

---

## 5. Non-Functional Requirements

### 5.1. Performance
- Main dashboard First Contentful Paint (FCP) < 1.2s.
- Instant client-side file filtering with zero UI lag for up to 1,000 files per directory.
- Chunked/streamed file transfers for uploads up to 500MB without memory exhaustion.

### 5.2. Security & Compliance
- Passwords hashed with bcrypt (salt factor 10).
- HTTP-only, SameSite lax cookies preventing XSS token theft.
- All Google Drive refresh tokens stored securely on the backend; never exposed to client browsers or mobile devices.
- Folder boundary validation on every API request.

### 5.3. Usability & Aesthetics
- Premium glassmorphic dark-mode visual design.
- Touch-friendly tap targets (minimum 44x44px) on mobile and Android.
- Zero jargon for family members: clear terms like "Upload Photos", "New Album", "Invite Family".

---

## 6. Release Roadmap

- **Phase 1 (MVP)**: Multi-Family, Google Drive OAuth + Sandbox, Invite codes, File Explorer, Upload, Delete, Preview.
- **Phase 2 (Mobile & Native)**: Capacitor Android setup, APK build workflow, Camera/gallery integration.
- **Phase 3 (Enterprise Utilities)**: Developer Broadcast Notifications, Self-Update Engine, Activity Feeds.
- **Phase 4 (Cloud Sync)**: CI/CD automated GitHub Actions, Google Cloud automated deployment.
