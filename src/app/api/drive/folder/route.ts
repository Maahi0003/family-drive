import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { createDriveFolder } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, name, parentId } = await req.json();

    if (!familyId || !name || name.trim() === '') {
      return NextResponse.json({ error: 'familyId and folder name are required' }, { status: 400 });
    }

    // Verify membership
    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this family' }, { status: 403 });
    }

    const newFolder = await createDriveFolder(familyId, name.trim(), parentId || null, user.id);

    await db.activityLog.create({
      data: {
        familyId,
        userId: user.id,
        action: 'CREATE_FOLDER',
        targetName: `Created folder "${name.trim()}"`,
      },
    });

    return NextResponse.json({ folder: newFolder });
  } catch (error: any) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
