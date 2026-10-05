export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface FamilySummary {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  role: 'ADMIN' | 'MEMBER';
  isOwner: boolean;
  memberCount: number;
  driveConnected: boolean;
  driveRootFolderName?: string | null;
  allowMemberDelete: boolean;
}

export interface DriveItem {
  id: string;
  name: string;
  description?: string | null;
  mimeType: string;
  size: number;
  isFolder: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  isDriveNative?: boolean;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  action: 'UPLOAD' | 'DELETE' | 'CREATE_FOLDER' | 'JOIN' | 'SETTINGS_UPDATE';
  targetName: string;
  userName: string;
  createdAt: string;
}
