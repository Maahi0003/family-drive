import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDriveClientForFamily } from '@/lib/google-drive';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const drive = await getDriveClientForFamily(familyId);
    if (!drive) {
      return NextResponse.json({
        folders: [
          { id: 'mock-folder-1', name: 'Family Documents (Sandbox)' },
          { id: 'mock-folder-2', name: 'Family Photos & Videos (Sandbox)' },
          { id: 'mock-folder-3', name: 'Vacation Trips (Sandbox)' },
        ],
      });
    }

    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      pageSize: 50,
      orderBy: 'name',
    });

    const folders = (res.data.files || []).map((f) => ({
      id: f.id || '',
      name: f.name || 'Untitled Folder',
    }));

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('List google folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
