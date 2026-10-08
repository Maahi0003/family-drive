import { google } from 'googleapis';
import { db } from './db';
import { DriveItem } from '@/types';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

function loadGoogleCredentials() {
  let clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  let redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback').trim();

  // Fallback 1: Parse directly from .env file in project root
  if (!clientId || !clientSecret) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of envContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith('GOOGLE_CLIENT_ID=')) {
            clientId = trimmed.replace(/^GOOGLE_CLIENT_ID=/, '').replace(/^["']|["']$/g, '').trim();
          } else if (trimmed.startsWith('GOOGLE_CLIENT_SECRET=')) {
            clientSecret = trimmed.replace(/^GOOGLE_CLIENT_SECRET=/, '').replace(/^["']|["']$/g, '').trim();
          } else if (trimmed.startsWith('GOOGLE_REDIRECT_URI=')) {
            redirectUri = trimmed.replace(/^GOOGLE_REDIRECT_URI=/, '').replace(/^["']|["']$/g, '').trim();
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback 2: Check for any downloaded client_secret*.json or credentials*.json in workspace
  if (!clientId || !clientSecret) {
    try {
      const rootDir = process.cwd();
      const files = fs.readdirSync(rootDir);
      const credFile = files.find(
        (f) =>
          (f.toLowerCase().includes('client_secret') ||
            f.toLowerCase().includes('credentials') ||
            f === 'google-credentials.json') &&
          f.endsWith('.json')
      );
      if (credFile) {
        const raw = fs.readFileSync(path.join(rootDir, credFile), 'utf-8');
        const parsed = JSON.parse(raw);
        const data = parsed.web || parsed.installed;
        if (data && data.client_id && data.client_secret) {
          clientId = data.client_id.trim();
          clientSecret = data.client_secret.trim();
          if (data.redirect_uris && data.redirect_uris.length > 0) {
            redirectUri = data.redirect_uris[0].trim();
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return { clientId, clientSecret, redirectUri };
}

export function parseGoogleCredentialsJson(rawContent: string | object) {
  try {
    const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    const data = parsed.web || parsed.installed || parsed;
    if (data && (data.client_id || data.clientId)) {
      return {
        clientId: String(data.client_id || data.clientId || '').trim(),
        clientSecret: String(data.client_secret || data.clientSecret || '').trim(),
        redirectUris: (data.redirect_uris || data.redirectUris || []) as string[],
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function isGoogleConfigured(family?: any): boolean {
  if (family?.googleClientId && family?.googleClientSecret) {
    return true;
  }
  const { clientId, clientSecret } = loadGoogleCredentials();
  return Boolean(clientId && clientSecret && clientId !== '' && clientSecret !== '');
}

export function getOAuth2Client(family?: any, redirectUriOverride?: string) {
  let clientId = family?.googleClientId;
  let clientSecret = family?.googleClientSecret;
  let redirectUri = redirectUriOverride;

  if (!clientId || !clientSecret) {
    const creds = loadGoogleCredentials();
    clientId = clientId || creds.clientId;
    clientSecret = clientSecret || creds.clientSecret;
    if (!redirectUri) redirectUri = creds.redirectUri;
  }

  if (!redirectUri) {
    redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(familyId: string, family?: any, redirectUriOverride?: string): string {
  const oauth2Client = getOAuth2Client(family, redirectUriOverride);
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: familyId,
  });
}

export async function getDriveClientForFamily(familyId: string) {
  const family = await db.family.findUnique({
    where: { id: familyId },
  });

  if (!family || !family.googleRefreshToken) {
    return null;
  }

  const oauth2Client = getOAuth2Client(family);
  oauth2Client.setCredentials({
    refresh_token: family.googleRefreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Ensure local upload dir exists for sandbox mode
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function listDriveFiles(
  familyId: string,
  folderId?: string | null
): Promise<{ items: DriveItem[]; currentFolder: { id: string | null; name: string } }> {
  const family = await db.family.findUnique({
    where: { id: familyId },
  });

  if (!family) throw new Error('Family not found');

  // Real Google Drive integration
  if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured(family)) {
    try {
      const drive = await getDriveClientForFamily(familyId);
      if (drive) {
        const targetFolder = folderId || family.driveRootFolderId || 'root';
        
        let currentFolderName = family.driveRootFolderName || 'Family Drive';
        if (targetFolder !== 'root' && targetFolder !== family.driveRootFolderId) {
          try {
            const folderMeta = await drive.files.get({
              fileId: targetFolder,
              fields: 'id, name',
            });
            if (folderMeta.data.name) currentFolderName = folderMeta.data.name;
          } catch (e) {
            // fallback name
          }
        }

        const res = await drive.files.list({
          q: `'${targetFolder}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, thumbnailLink, webContentLink, iconLink, description)',
          orderBy: 'folder, name',
          pageSize: 100,
        });

        const items: DriveItem[] = (res.data.files || []).map((file) => ({
          id: file.id || '',
          name: file.name || 'Untitled',
          description: file.description || null,
          mimeType: file.mimeType || 'application/octet-stream',
          size: file.size ? parseInt(file.size, 10) : 0,
          isFolder: file.mimeType === 'application/vnd.google-apps.folder',
          parentId: targetFolder,
          createdAt: file.createdTime || new Date().toISOString(),
          updatedAt: file.modifiedTime || new Date().toISOString(),
          thumbnailUrl: file.thumbnailLink || undefined,
          downloadUrl: `/api/drive/download/${file.id}?familyId=${familyId}`,
          isDriveNative: true,
        }));

        return {
          items,
          currentFolder: {
            id: targetFolder === family.driveRootFolderId ? null : targetFolder,
            name: currentFolderName,
          },
        };
      }
    } catch (err: any) {
      console.error('Google Drive API error, falling back to sandbox mode:', err.message);
    }
  }

  // Sandbox / Demo mode
  const parent = folderId && folderId !== 'root' ? folderId : null;
  let currentFolderName = family.name + ' Drive';

  if (parent) {
    const parentFolder = await db.virtualDriveFile.findUnique({
      where: { id: parent },
    });
    if (parentFolder) currentFolderName = parentFolder.name;
  }

  const virtualFiles = await db.virtualDriveFile.findMany({
    where: {
      familyId,
      parentId: parent,
    },
    include: {
      uploader: { select: { name: true } },
    },
    orderBy: [
      { isFolder: 'desc' },
      { name: 'asc' },
    ],
  });

  const items: DriveItem[] = virtualFiles.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    mimeType: f.mimeType,
    size: f.size,
    isFolder: f.isFolder,
    parentId: f.parentId,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    uploaderName: f.uploader.name,
    downloadUrl: `/api/drive/download/${f.id}?familyId=${familyId}`,
    isDriveNative: false,
  }));

  return {
    items,
    currentFolder: {
      id: parent,
      name: currentFolderName,
    },
  };
}

export async function createDriveFolder(
  familyId: string,
  name: string,
  parentId?: string | null,
  userId?: string
): Promise<DriveItem> {
  const family = await db.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error('Family not found');

  if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured(family)) {
    try {
      const drive = await getDriveClientForFamily(familyId);
      if (drive) {
        const targetParent = parentId || family.driveRootFolderId || 'root';
        const res = await drive.files.create({
          requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [targetParent],
          },
          fields: 'id, name, mimeType, createdTime, modifiedTime',
        });

        const created = res.data;
        return {
          id: created.id || '',
          name: created.name || name,
          mimeType: 'application/vnd.google-apps.folder',
          size: 0,
          isFolder: true,
          parentId: targetParent,
          createdAt: created.createdTime || new Date().toISOString(),
          updatedAt: created.modifiedTime || new Date().toISOString(),
          isDriveNative: true,
        };
      }
    } catch (err: any) {
      console.error('Google Drive folder create error:', err.message);
    }
  }

  // Sandbox fallback
  const created = await db.virtualDriveFile.create({
    data: {
      familyId,
      name,
      mimeType: 'application/vnd.google-apps.folder',
      isFolder: true,
      size: 0,
      parentId: parentId || null,
      uploaderId: userId || family.ownerId,
    },
    include: { uploader: { select: { name: true } } },
  });

  return {
    id: created.id,
    name: created.name,
    mimeType: created.mimeType,
    size: 0,
    isFolder: true,
    parentId: created.parentId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    uploaderName: created.uploader.name,
    isDriveNative: false,
  };
}

export async function uploadDriveFile(
  familyId: string,
  file: { name: string; type: string; size: number; buffer: Buffer; description?: string | null },
  parentId?: string | null,
  userId?: string
): Promise<DriveItem> {
  const family = await db.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error('Family not found');

  if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured(family)) {
    try {
      const drive = await getDriveClientForFamily(familyId);
      if (drive) {
        const targetParent = parentId || family.driveRootFolderId || 'root';
        const readable = new Readable();
        readable.push(file.buffer);
        readable.push(null);

        const res = await drive.files.create({
          requestBody: {
            name: file.name,
            description: file.description || undefined,
            parents: [targetParent],
          },
          media: {
            mimeType: file.type || 'application/octet-stream',
            body: readable,
          },
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, description',
        });

        const uploaded = res.data;
        return {
          id: uploaded.id || '',
          name: uploaded.name || file.name,
          description: uploaded.description || file.description || null,
          mimeType: uploaded.mimeType || file.type,
          size: uploaded.size ? parseInt(uploaded.size, 10) : file.size,
          isFolder: false,
          parentId: targetParent,
          createdAt: uploaded.createdTime || new Date().toISOString(),
          updatedAt: uploaded.modifiedTime || new Date().toISOString(),
          downloadUrl: `/api/drive/download/${uploaded.id}?familyId=${familyId}`,
          isDriveNative: true,
        };
      }
    } catch (err: any) {
      console.error('Google Drive file upload error:', err.message);
    }
  }

  // Sandbox fallback: save buffer to local file storage
  const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOAD_DIR, safeFilename);
  fs.writeFileSync(filePath, file.buffer);

  // If file is image and under 300KB, create base64 preview for instant rendering
  let contentData: string | null = null;
  if (file.type.startsWith('image/') && file.size < 500000) {
    contentData = `data:${file.type};base64,${file.buffer.toString('base64')}`;
  }

  const created = await db.virtualDriveFile.create({
    data: {
      familyId,
      name: file.name,
      description: file.description || null,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      isFolder: false,
      parentId: parentId || null,
      contentPath: safeFilename,
      contentData,
      uploaderId: userId || family.ownerId,
    },
    include: { uploader: { select: { name: true } } },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    mimeType: created.mimeType,
    size: created.size,
    isFolder: false,
    parentId: created.parentId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    uploaderName: created.uploader.name,
    downloadUrl: `/api/drive/download/${created.id}?familyId=${familyId}`,
    isDriveNative: false,
  };
}

export async function updateDriveFile(
  familyId: string,
  itemId: string,
  file: { name?: string; type: string; size: number; buffer: Buffer; description?: string | null },
  userId?: string
): Promise<DriveItem> {
  const family = await db.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error('Family not found');

  if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured(family)) {
    try {
      const drive = await getDriveClientForFamily(familyId);
      if (drive) {
        const readable = new Readable();
        readable.push(file.buffer);
        readable.push(null);

        const res = await drive.files.update({
          fileId: itemId,
          requestBody: {
            name: file.name || undefined,
            description: file.description !== undefined ? (file.description || '') : undefined,
          },
          media: {
            mimeType: file.type || 'application/octet-stream',
            body: readable,
          },
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, description',
        });

        const updated = res.data;
        return {
          id: updated.id || itemId,
          name: updated.name || file.name || 'Untitled',
          description: updated.description || file.description || null,
          mimeType: updated.mimeType || file.type,
          size: updated.size ? parseInt(updated.size, 10) : file.size,
          isFolder: false,
          createdAt: updated.createdTime || new Date().toISOString(),
          updatedAt: updated.modifiedTime || new Date().toISOString(),
          downloadUrl: `/api/drive/download/${updated.id}?familyId=${familyId}`,
          isDriveNative: true,
        };
      }
    } catch (err: any) {
      console.error('Google Drive file update error:', err.message);
    }
  }

  // Sandbox fallback: update local virtualDriveFile and replace local storage buffer
  const item = await db.virtualDriveFile.findFirst({
    where: { id: itemId, familyId },
    include: { uploader: { select: { name: true } } },
  });

  if (!item) throw new Error('File not found in family drive');

  const safeFilename = item.contentPath || `${Date.now()}_${(file.name || item.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fullPath = path.join(UPLOAD_DIR, safeFilename);
  fs.writeFileSync(fullPath, file.buffer);

  let contentData: string | null = null;
  if (file.type.startsWith('image/') && file.size < 500000) {
    contentData = `data:${file.type};base64,${file.buffer.toString('base64')}`;
  }

  const updated = await db.virtualDriveFile.update({
    where: { id: itemId },
    data: {
      name: file.name || item.name,
      mimeType: file.type,
      size: file.size,
      contentPath: safeFilename,
      contentData,
      description: file.description !== undefined ? file.description : item.description,
    },
    include: { uploader: { select: { name: true } } },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    mimeType: updated.mimeType,
    size: updated.size,
    isFolder: false,
    parentId: updated.parentId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    uploaderName: updated.uploader.name,
    downloadUrl: `/api/drive/download/${updated.id}?familyId=${familyId}`,
    isDriveNative: false,
  };
}

export async function deleteDriveItem(familyId: string, itemId: string): Promise<boolean> {
  const family = await db.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error('Family not found');

  // Safeguard: Prevent deleting the configured root family folder itself
  if (family.driveRootFolderId && itemId === family.driveRootFolderId) {
    throw new Error('Security Error: Cannot delete the designated root family folder');
  }

  if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured(family)) {
    try {
      const drive = await getDriveClientForFamily(familyId);
      if (drive) {
        await drive.files.delete({ fileId: itemId });
        return true;
      }
    } catch (err: any) {
      console.error('Google Drive delete error:', err.message);
    }
  }

  // Sandbox fallback: delete virtual file with strict tenant isolation
  const item = await db.virtualDriveFile.findFirst({
    where: { id: itemId, familyId },
  });
  if (item) {
    if (item.contentPath) {
      const fullPath = path.join(UPLOAD_DIR, item.contentPath);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
    // Delete recursively if folder
    if (item.isFolder) {
      await db.virtualDriveFile.deleteMany({
        where: {
          familyId,
          parentId: item.id,
        },
      });
    }
    await db.virtualDriveFile.delete({ where: { id: itemId } });
    return true;
  }

  return false;
}
