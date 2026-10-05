# REST API Documentation
## FamilyDrive — Endpoints, Schemas & Protocols

---

## 1. Authentication & Protocols

All protected endpoints require an authenticated session token transmitted via HTTP-Only cookie `family_drive_token`.

### Standard Response Format
- **Success**: HTTP 200/201 with JSON payload
- **Client Error**: HTTP 400/401/403/404 with `{ "error": "Descriptive error message" }`
- **Server Error**: HTTP 500 with `{ "error": "Internal server error" }`

---

## 2. Authentication APIs

### 2.1. Register User
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Alex Anderson",
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "user": {
      "id": "cuid_xyz",
      "email": "alex@example.com",
      "name": "Alex Anderson"
    }
  }
  ```

### 2.2. Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```

### 2.3. Check Current Session
- **Endpoint**: `GET /api/auth/me`
- **Access**: Protected
- **Success Response (200)**:
  ```json
  {
    "user": {
      "id": "cuid_xyz",
      "email": "alex@example.com",
      "name": "Alex Anderson",
      "avatarUrl": null,
      "createdAt": "2026-10-04T12:00:00.000Z"
    }
  }
  ```

### 2.4. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Public
- **Action**: Clears `family_drive_token` cookie.

---

## 3. Family Management APIs

### 3.1. List User Families
- **Endpoint**: `GET /api/families`
- **Access**: Protected
- **Success Response (200)**:
  ```json
  {
    "families": [
      {
        "id": "fam_123",
        "name": "The Anderson Family",
        "description": "Shared home photos & documents",
        "inviteCode": "FAM-8K4T9M",
        "role": "ADMIN",
        "isOwner": true,
        "memberCount": 4,
        "driveConnected": true,
        "driveRootFolderName": "Anderson Family Drive",
        "allowMemberDelete": true
      }
    ]
  }
  ```

### 3.2. Create Family
- **Endpoint**: `POST /api/families`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "name": "Vacation Crew",
    "description": "2026 trip memories"
  }
  ```
- **Returns**: Newly created `FamilySummary` with auto-generated unique invite code.

### 3.3. Join Family via Invite Code
- **Endpoint**: `POST /api/families/join`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "inviteCode": "FAM-8K4T9M"
  }
  ```
- **Returns**: Joined `FamilySummary` object.

### 3.4. Update Family Settings (Admin Only)
- **Endpoint**: `PATCH /api/families/[id]`
- **Access**: Family Admin Only
- **Request Body**:
  ```json
  {
    "name": "Updated Family Name",
    "description": "New description",
    "allowMemberDelete": false,
    "driveRootFolderId": "1aB2cD3eF4gH5iJ6kL7mN8oP"
  }
  ```

### 3.5. Regenerate Invite Code (Admin Only)
- **Endpoint**: `POST /api/families/[id]/invite-code`
- **Access**: Family Admin Only
- **Returns**: `{ "inviteCode": "FAM-9X2L4K" }`

### 3.6. Family Member Management
- **List Members**: `GET /api/families/[id]/members`
- **Remove Member**: `DELETE /api/families/[id]/members?userId=[targetUserId]`

---

## 4. Google Drive & File Operations APIs

### 4.1. List Files in Folder
- **Endpoint**: `GET /api/drive/files?familyId=[id]&folderId=[folderId]`
- **Access**: Family Member
- **Success Response (200)**:
  ```json
  {
    "items": [
      {
        "id": "item_abc",
        "name": "Summer Vacation",
        "mimeType": "application/vnd.google-apps.folder",
        "size": 0,
        "isFolder": true,
        "parentId": null,
        "createdAt": "2026-10-04T12:00:00.000Z",
        "updatedAt": "2026-10-04T12:00:00.000Z",
        "isDriveNative": true
      },
      {
        "id": "file_123",
        "name": "beach_sunset.jpg",
        "mimeType": "image/jpeg",
        "size": 3482100,
        "isFolder": false,
        "parentId": "item_abc",
        "downloadUrl": "/api/drive/download/file_123?familyId=fam_123",
        "isDriveNative": true
      }
    ],
    "currentFolder": {
      "id": null,
      "name": "Family Drive"
    }
  }
  ```

### 4.2. Upload File
- **Endpoint**: `POST /api/drive/upload`
- **Access**: Family Member
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `familyId`: String (required)
  - `parentId`: String (optional, null for root)
  - `file`: Binary file stream (required)
- **Returns**: Uploaded `DriveItem` metadata.

### 4.3. Create Folder
- **Endpoint**: `POST /api/drive/folder`
- **Access**: Family Member
- **Request Body**:
  ```json
  {
    "familyId": "fam_123",
    "name": "Trip Receipts",
    "parentId": null
  }
  ```

### 4.4. Download / Stream File
- **Endpoint**: `GET /api/drive/download/[id]?familyId=[famId]&inline=[true|false]`
- **Access**: Family Member
- **Response**: Binary stream with headers:
  - `Content-Type`: file MIME type
  - `Content-Disposition`: `inline` (for preview) or `attachment; filename="name"` (for download)

### 4.5. Delete Item
- **Endpoint**: `DELETE /api/drive/files/[id]?familyId=[famId]`
- **Access**: Family Member (if `allowMemberDelete` is true) or Admin

---

## 5. Developer Broadcast & Notification APIs

### 5.1. Send Broadcast Notification (Developer/Admin)
- **Endpoint**: `POST /api/admin/broadcast`
- **Access**: Admin / Developer
- **Request Body**:
  ```json
  {
    "title": "New Update Available: v1.1.0",
    "message": "We have added video streaming and audio preview support!",
    "severity": "info",
    "targetFamilyId": null
  }
  ```

### 5.2. List User Notifications
- **Endpoint**: `GET /api/notifications`
- **Access**: Protected
- **Returns**:
  ```json
  {
    "notifications": [
      {
        "id": "notif_1",
        "title": "New Update Available: v1.1.0",
        "message": "We have added video streaming!",
        "severity": "info",
        "read": false,
        "createdAt": "2026-10-04T12:00:00.000Z"
      }
    ]
  }
  ```

### 5.3. Mark Notification as Read
- **Endpoint**: `PATCH /api/notifications/[id]`
- **Access**: Protected
- **Request Body**: `{ "read": true }`

---

## 6. Self-Update Engine API

### 6.1. Version Check
- **Endpoint**: `GET /api/app/version?platform=[android|web]&current=[version]`
- **Access**: Public
- **Success Response (200)**:
  ```json
  {
    "currentVersion": "1.0.0",
    "latestVersion": "1.1.0",
    "updateAvailable": true,
    "mandatory": false,
    "releaseDate": "2026-10-04",
    "downloadUrl": "https://github.com/familydrive/app/releases/download/v1.1.0/familydrive-v1.1.0.apk",
    "changelog": [
      "Added high-definition video player support",
      "Added in-app developer notification tray",
      "Fixed Android 14 photo picker permissions",
      "Performance improvements for large photo folders"
    ]
  }
  ```
