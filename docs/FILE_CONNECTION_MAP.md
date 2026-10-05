# File Connection Map & Architecture Reference
## FamilyDrive — System Interconnection & Data Flow

---

## 1. Directory Tree & File Inventory

```
drive app/
├── .github/
│   └── workflows/
│       ├── web-ci.yml                   # CI/CD: Automated linting, test & web build
│       └── android-build.yml            # CI/CD: Android APK build & release generation
├── docs/
│   ├── PRD.md                           # Product Requirements Document
│   ├── UI_UX_DESIGN.md                  # Visual tokens, screens & UX specifications
│   ├── FILE_CONNECTION_MAP.md           # This document (File map & architecture)
│   └── API_DOCUMENTATION.md             # REST API endpoints & payload schemas
├── prisma/
│   ├── schema.prisma                    # SQLite database schema (Users, Families, Files, Notifications)
│   └── seed.ts                          # Database seeder (Demo users, families, files, broadcasts)
├── public/
│   ├── manifest.json                    # PWA Web App Manifest (Android installable)
│   └── uploads/                         # Local sandbox upload storage directory
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── broadcast/route.ts   # Developer/Admin system broadcast creation
│   │   │   ├── app/
│   │   │   │   └── version/route.ts     # In-app Self-Update version check & APK metadata
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       # Email/password authentication
│   │   │   │   ├── logout/route.ts      # Session termination
│   │   │   │   ├── me/route.ts          # Current authenticated user check
│   │   │   │   └── register/route.ts    # New user registration
│   │   │   ├── drive/
│   │   │   │   ├── download/[id]/route.ts # File stream for download & preview
│   │   │   │   ├── files/[id]/route.ts  # File & folder deletion with permission checks
│   │   │   │   ├── files/route.ts       # File & folder listing within root boundary
│   │   │   │   ├── folder/route.ts      # New subfolder creation
│   │   │   │   └── upload/route.ts      # Multi-part file upload handler
│   │   │   ├── families/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── activities/route.ts # Family activity audit log
│   │   │   │   │   ├── invite-code/route.ts# Invite code regeneration (Admin)
│   │   │   │   │   ├── members/route.ts # Member roster & remove member
│   │   │   │   │   └── route.ts         # Family details & settings update
│   │   │   │   ├── join/route.ts        # Join family via invite code
│   │   │   │   └── route.ts             # List user families & create new family
│   │   │   ├── google/
│   │   │   │   ├── auth-url/route.ts    # Google OAuth consent URL generator
│   │   │   │   ├── callback/route.ts    # OAuth callback, token exchange & storage
│   │   │   │   └── folders/route.ts     # Google Drive folder picker API
│   │   │   └── notifications/
│   │   │       ├── [id]/route.ts        # Mark notification as read
│   │   │       └── route.ts             # List notifications for current user
│   │   ├── invite/
│   │   │   └── [code]/page.tsx          # 1-Click invite landing page
│   │   ├── globals.css                  # Design system tokens & utility classes
│   │   ├── layout.tsx                   # Root HTML layout & fonts
│   │   └── page.tsx                     # Main Dashboard & file explorer page
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthCard.tsx             # Login, registration & quick demo accounts
│   │   ├── drive/
│   │   │   ├── Breadcrumbs.tsx          # Folder navigation breadcrumb trail
│   │   │   ├── DeleteConfirmModal.tsx   # Deletion confirmation dialog
│   │   │   ├── FileExplorer.tsx         # Main explorer toolbar, grid & state
│   │   │   ├── FileGrid.tsx             # Card view layout
│   │   │   ├── FileList.tsx             # Table view layout
│   │   │   ├── FilePreviewModal.tsx     # Lightbox previewer (images, video, audio, pdf)
│   │   │   ├── FileUploadModal.tsx      # Multi-file drag & drop queue
│   │   │   └── NewFolderModal.tsx       # Folder creation dialog
│   │   ├── family/
│   │   │   ├── ActivityFeedModal.tsx    # Family audit history stream
│   │   │   ├── CreateFamilyModal.tsx    # New family creation wizard
│   │   │   ├── FamilySettingsModal.tsx  # Drive config, invite codes, permissions
│   │   │   └── JoinFamilyModal.tsx      # Enter invite code modal
│   │   ├── layout/
│   │   │   ├── AppShell.tsx             # Main header, user profile, invite shortcuts
│   │   │   ├── FamilySwitcher.tsx       # Dropdown to switch active family
│   │   │   └── NotificationBell.tsx     # In-app developer broadcast notification tray
│   │   └── update/
│   │       └── UpdateModal.tsx          # In-app self-update checker & APK installer
│   ├── lib/
│   │   ├── auth.ts                      # Password hashing, JWT signing & verification
│   │   ├── db.ts                        # Prisma Client singleton
│   │   ├── google-drive.ts              # Google Drive API client + Sandbox fallback
│   │   └── utils.ts                     # Formatting, invite code generation, categories
│   └── types/
│       └── index.ts                     # TypeScript interfaces
├── capacitor.config.json                # Android Native Capacitor configuration
├── package.json                         # Dependencies & scripts
└── tsconfig.json                        # TypeScript configuration
```

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Clients["Clients"]
        Browser["Desktop & Mobile Web Browser"]
        AndroidApp["Android App (Capacitor Native APK)"]
    end

    subgraph Presentation["Presentation Layer (Next.js & React)"]
        Page["src/app/page.tsx (Dashboard)"]
        InvitePage["src/app/invite/[code]/page.tsx"]
        AppShell["src/components/layout/AppShell.tsx"]
        FileExplorer["src/components/drive/FileExplorer.tsx"]
        NotificationBell["src/components/layout/NotificationBell.tsx"]
        UpdateModal["src/components/update/UpdateModal.tsx"]
        FamilySettings["src/components/family/FamilySettingsModal.tsx"]
    end

    subgraph API_Routes["API Routing Layer (src/app/api/)"]
        AuthAPI["/api/auth/* (Login, Register, Me)"]
        FamilyAPI["/api/families/* (Create, Join, Settings, Members)"]
        DriveAPI["/api/drive/* (Files, Upload, Folder, Delete, Download)"]
        GoogleAPI["/api/google/* (OAuth, Callback, Folder Picker)"]
        NotifAPI["/api/notifications/* & /api/admin/broadcast"]
        UpdateAPI["/api/app/version (Self-Update Engine)"]
    end

    subgraph Core_Libraries["Core Services & Logic (src/lib/)"]
        AuthLib["src/lib/auth.ts (JWT & Passwords)"]
        GDriveLib["src/lib/google-drive.ts (Drive API + Sandbox)"]
        DBLib["src/lib/db.ts (Prisma Client)"]
    end

    subgraph Storage_Layer["Storage & External Providers"]
        SQLiteDB[("SQLite Database (dev.db)")]
        LocalFiles[("Local File Cache (public/uploads/)")]
        GoogleCloud["Google Cloud (Drive API v3 & OAuth 2.0)"]
    end

    Browser --> Page
    AndroidApp --> Page
    Browser --> InvitePage
    AndroidApp --> InvitePage

    Page --> AppShell
    Page --> FileExplorer
    AppShell --> NotificationBell
    AppShell --> UpdateModal
    AppShell --> FamilySettings

    AppShell --> AuthAPI
    FamilySettings --> FamilyAPI
    FamilySettings --> GoogleAPI
    FileExplorer --> DriveAPI
    NotificationBell --> NotifAPI
    UpdateModal --> UpdateAPI

    AuthAPI --> AuthLib
    AuthAPI --> DBLib
    FamilyAPI --> DBLib
    GoogleAPI --> GDriveLib
    GoogleAPI --> DBLib
    DriveAPI --> GDriveLib
    DriveAPI --> DBLib
    NotifAPI --> DBLib
    UpdateAPI --> DBLib

    GDriveLib --> GoogleCloud
    GDriveLib --> LocalFiles
    DBLib --> SQLiteDB
```

---

## 3. End-to-End User Data Flows

### Flow 1: Family Member Joins with Invite Code
```mermaid
sequenceDiagram
    autonumber
    actor Member as Family Member
    participant UI as JoinFamilyModal / InvitePage
    participant API as /api/families/join
    participant DB as Prisma (SQLite)

    Member->>UI: Enters Invite Code (e.g. FAM-8K4T9M)
    UI->>API: POST /api/families/join { inviteCode }
    API->>DB: Query Family by unique inviteCode
    alt Invalid Code
        API-->>UI: 404 Error: Family Not Found
    else Valid Code
        API->>DB: Check existing FamilyMember record
        API->>DB: Insert FamilyMember (role: "MEMBER")
        API->>DB: Insert ActivityLog ("Alex joined the family")
        API-->>UI: 200 OK: Returns Family details
        UI->>Member: Switches active family & displays shared files!
    end
```

### Flow 2: File Upload to Designated Google Drive Folder
```mermaid
sequenceDiagram
    autonumber
    actor User as Family Member
    participant UI as FileUploadModal
    participant API as /api/drive/upload
    participant GDrive as Google Drive API / Sandbox
    participant DB as Prisma (SQLite)

    User->>UI: Drags & drops photo or selects from Android gallery
    UI->>API: POST /api/drive/upload (multipart: familyId, folderId, file)
    API->>DB: Validate user membership in familyId
    alt Google Drive Connected
        API->>GDrive: drive.files.create (file buffer, parentFolderId)
        GDrive-->>API: Returns Google Drive fileId & metadata
    else Sandbox Mode
        API->>GDrive: Save to public/uploads/
        API->>DB: Insert VirtualDriveFile record
    end
    API->>DB: Insert ActivityLog ("User uploaded photo.jpg")
    API-->>UI: 200 OK: File upload complete!
    UI->>User: Displays newly uploaded file in FileExplorer
```

### Flow 3: Developer Broadcasts In-App Notification
```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Admin
    participant API as /api/admin/broadcast
    participant DB as Prisma (SQLite)
    actor FamilyUser as Family Members
    participant App as NotificationBell UI

    Dev->>API: POST /api/admin/broadcast { title, message, severity, targetFamilyId: null }
    API->>DB: Insert SystemBroadcast record
    API->>DB: Generate Notification records for targeted users
    FamilyUser->>App: Opens FamilyDrive app
    App->>DB: GET /api/notifications (fetches unread)
    App-->>FamilyUser: Shows badge counter & displays alert in tray
```

### Flow 4: In-App Self-Update (Android APK)
```mermaid
sequenceDiagram
    autonumber
    participant App as Android Client (v1.0.0)
    participant API as /api/app/version
    participant UI as UpdateModal
    actor User as Android User

    App->>API: GET /api/app/version?platform=android&current=1.0.0
    API-->>App: { latestVersion: "1.1.0", downloadUrl: "https://.../app-v1.1.0.apk", changelog: [...] }
    alt Newer Version Available
        App->>UI: Show "Update Available" Dialog
        UI->>User: Displays changelog & "Download APK" button
        User->>UI: Taps "Download & Install"
        UI->>User: Downloads APK & invokes native Android Package Installer
    end
```

---

## 4. UI Component to API Endpoint Mapping

| Component | Target API Endpoint | HTTP Method | Payload / Response |
| :--- | :--- | :--- | :--- |
| `AuthCard.tsx` | `/api/auth/login` | `POST` | `{ email, password }` -> User session |
| `AuthCard.tsx` | `/api/auth/register` | `POST` | `{ name, email, password }` -> User session |
| `FamilySwitcher.tsx` | `/api/families` | `GET` | List of user's active families |
| `CreateFamilyModal.tsx` | `/api/families` | `POST` | `{ name, description }` -> Family |
| `JoinFamilyModal.tsx` | `/api/families/join` | `POST` | `{ inviteCode }` -> Joined Family |
| `FamilySettingsModal.tsx`| `/api/families/[id]` | `PATCH` | `{ name, allowMemberDelete, driveRootFolderId }` |
| `FamilySettingsModal.tsx`| `/api/families/[id]/invite-code` | `POST` | Regenerate code -> `{ inviteCode }` |
| `FamilySettingsModal.tsx`| `/api/families/[id]/members` | `GET`, `DELETE` | List / Remove member |
| `FamilySettingsModal.tsx`| `/api/google/auth-url` | `GET` | Initiates Google OAuth consent |
| `FileExplorer.tsx` | `/api/drive/files` | `GET` | List items inside active folder |
| `NewFolderModal.tsx` | `/api/drive/folder` | `POST` | `{ familyId, name, parentId }` |
| `FileUploadModal.tsx` | `/api/drive/upload` | `POST` | Multipart file upload |
| `FilePreviewModal.tsx` | `/api/drive/download/[id]` | `GET` | Stream file content with `inline=true` |
| `DeleteConfirmModal.tsx`| `/api/drive/files/[id]` | `DELETE`| Remove file/folder (permission guarded) |
| `NotificationBell.tsx` | `/api/notifications` | `GET`, `PATCH` | Fetch broadcasts, mark as read |
| `UpdateModal.tsx` | `/api/app/version` | `GET` | Check latest version & APK download link |
