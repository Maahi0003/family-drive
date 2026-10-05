# Security & Secrets Architecture Assessment
## FamilyDrive — Cross-Platform Web & Android Application

---

## 1. Backend & Data Storage Architecture

### 1.1. Backend Framework & Runtime
* **Framework**: **Next.js 14 (App Router Route Handlers)** running on **Node.js**.
* **Architecture**: Server-side executed API endpoints (`/api/auth/*`, `/api/families/*`, `/api/drive/*`, `/api/notifications/*`).
* **Zero Client DB Access**: The client never communicates directly with the database or third-party cloud APIs. All requests pass through server-side route handlers that enforce authentication and tenant isolation.

### 1.2. Database & Data Persistence
* **ORM**: **Prisma ORM (`@prisma/client`)**.
* **Storage Engine**: **SQLite (`prisma/dev.db`)**.
* **Production Scalability**: The Prisma schema (`prisma/schema.prisma`) is completely provider-agnostic. Switching to production-grade **PostgreSQL**, **MySQL**, or **Google Cloud SQL** requires only changing the `provider` string in `schema.prisma`.
* **Entities Stored**:
  - `User`: User profile and bcrypt password hashes.
  - `Family`: Family accounts, invite codes, designated Google Drive folder IDs, and encrypted refresh tokens.
  - `FamilyMember`: Relational mapping of user-to-family with role (`ADMIN` vs `MEMBER`).
  - `VirtualDriveFile`: Metadata and folder hierarchies for sandbox & local files.
  - `ActivityLog`: Immutable family audit trail (uploads, deletes, settings changes).
  - `SystemBroadcast` & `Notification`: Developer/admin notifications and user read states.

### 1.3. Authentication & Session Management
* **Password Security**:
  - Hashing algorithm: **bcrypt** (`bcryptjs`) with **10 salt rounds**.
  - Passwords are never stored in plaintext or reversible formats.
  - Verification uses constant-time string comparison to prevent side-channel timing attacks.
* **Session Token Generation**:
  - Cryptographic standard: **JSON Web Tokens (JWT)** generated using the **`jose`** library with **`HS256`** signature algorithm.
  - Token payload contains only non-sensitive metadata: `{ id, email, name }`.
* **Cookie Transport Security**:
  - Token is stored inside an **`HttpOnly`** cookie (`family_drive_token`).
  - **XSS Protection**: `HttpOnly: true` ensures client-side JavaScript (`document.cookie`) cannot access or steal the session token.
  - **CSRF Protection**: `SameSite: 'lax'` prevents cross-site request forgery attacks.
  - **HTTPS Transport**: `Secure: true` automatically enforced in production environments.
  - **Lifecycle**: Configured with a 30-day expiration window.

---

## 2. Secrets & Credential Security Audit

### 2.1. Environment Variables & Version Control
* **`.gitignore` Protection**:
  - `.env`, `.env.local`, `.env*.local`, and `.env.production` are strictly ignored by Git.
  - Secret keys can never be accidentally committed to public or private version control repositories.
* **Sample Configuration (`.env.example`)**:
  - A clean, sanitized `.env.example` is maintained with placeholder keys and setup instructions for developers.

### 2.2. Secrets Inventory & Exposure Surface
| Secret Name | Location | Purpose | Client-Side Exposure |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Server `.env` | Signs and verifies authentication session tokens | **Never Exposed (Backend Only)** |
| `GOOGLE_CLIENT_ID` | Server `.env` | OAuth 2.0 Web Client identifier for Google Cloud | **Never Exposed (Backend Only)** |
| `GOOGLE_CLIENT_SECRET` | Server `.env` | OAuth 2.0 secret for token exchange with Google | **Never Exposed (Backend Only)** |
| `googleRefreshToken` | SQLite DB (`Family`) | Offline access token for Google Drive API v3 | **Never Exposed (Stripped in API)** |
| `passwordHash` | SQLite DB (`User`) | Salted bcrypt hash of user passwords | **Never Exposed (Stripped in API)** |

---

## 3. Application Security & Access Control (RBAC)

### 3.1. Tenant Isolation (Multi-Family Security Boundary)
* Every file access, download, upload, and delete request requires a `familyId`.
* The server verifies that the authenticated user has an active record in `FamilyMember` for that specific `familyId`.
* **Cross-Tenant Mitigation**: In `src/lib/google-drive.ts` and `src/app/api/drive/download/[id]/route.ts`, queries strictly require `{ id: itemId, familyId: familyId }`, preventing malicious ID-harvesting across different families.

### 3.2. Role-Based Access Control (Admin vs. Member)
| Action | Admin | Member | Enforcement Layer |
| :--- | :---: | :---: | :--- |
| **View Files & Folders** | ✅ | ✅ | `GET /api/drive/files` (Membership required) |
| **Download Files** | ✅ | ✅ | `GET /api/drive/download/[id]` (Membership required) |
| **Upload Files & Create Folders** | ✅ | ✅ | `POST /api/drive/upload`, `POST /api/drive/folder` |
| **Delete Files / Folders** | ✅ | Configurable | `DELETE /api/drive/files/[id]` (Checks `allowMemberDelete`) |
| **Connect / Change Google Drive** | ✅ | ❌ | `GET /api/google/auth-url`, `PATCH /api/families/[id]` |
| **Modify Family Settings** | ✅ | ❌ | `PATCH /api/families/[id]` (Admin check) |
| **Generate / Rotate Invite Code** | ✅ | ❌ | `POST /api/families/[id]/invite-code` (Admin check) |
| **Post System Broadcasts** | ✅ | ❌ | `POST /api/admin/broadcast` (Admin check) |

### 3.3. Google Drive Root Folder Containment
* **Containment Principle**: The Admin grants OAuth permissions for a dedicated root folder (e.g., `/Family Hub 2026`).
* **Root Deletion Lock**: The application explicitly blocks deletion of the designated root family folder:
  ```ts
  if (family.driveRootFolderId && itemId === family.driveRootFolderId) {
    throw new Error('Security Error: Cannot delete the designated root family folder');
  }
  ```
* **Boundary Integrity**: Non-admin family members never receive OAuth credentials or direct access to the admin's personal Google Drive files outside the designated family folder.

---

## 4. Threat Matrix & OWASP Top 10 Compliance

| OWASP Threat | Risk Level | FamilyDrive Mitigation Strategy |
| :--- | :---: | :--- |
| **A01: Broken Access Control** | **HIGH** | Strict server-side RBAC middleware and database-level tenant isolation checks on every route. |
| **A02: Cryptographic Failures** | **HIGH** | `bcrypt` (10 rounds) for passwords; `jose` `HS256` for JWTs; HTTP-Only cookie transport. |
| **A03: Injection (SQL / Command)** | **CRITICAL** | Prisma ORM uses parameterized queries, eliminating SQL injection. File uploads sanitize paths using `path.basename`. |
| **A04: Insecure Design** | **MEDIUM** | Admin-governed delete permissions (`allowMemberDelete`) prevent accidental or malicious family file wiping. |
| **A05: Security Misconfiguration** | **MEDIUM** | `.env` excluded from version control; Sandbox fallback operates with zero exposed cloud keys. |
| **A06: Vulnerable Components** | **LOW** | Modern Next.js 14 and verified dependencies (`jose`, `bcryptjs`, `@prisma/client`, `googleapis`). |
| **A07: Identification & Auth Failures** | **HIGH** | Session cookies are protected with `SameSite=lax`, `HttpOnly=true`, and strict verification. |
| **A08: Software & Data Integrity** | **LOW** | In-app self-update checks cryptographic version payloads (`GET /api/app/version`). |
| **A09: Security Logging & Monitoring** | **LOW** | `ActivityLog` records every join, upload, delete, and settings alteration with user ID and timestamp. |
| **A10: Server-Side Request Forgery** | **LOW** | Google OAuth callback validates state tokens against the database `familyId`. |
