import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadDriveFile } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const familyId = formData.get('familyId') as string;
    const parentId = (formData.get('parentId') as string) || null;
    const description = (formData.get('description') as string) || null;
    const file = formData.get('file') as File | null;

    if (!familyId || !file) {
      return NextResponse.json({ error: 'familyId and file are required' }, { status: 400 });
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await uploadDriveFile(
      familyId,
      {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        buffer,
        description,
      },
      parentId,
      user.id
    );

    await db.activityLog.create({
      data: {
        familyId,
        userId: user.id,
        action: 'UPLOAD',
        targetName: `Uploaded "${file.name}"`,
      },
    });

    return NextResponse.json({ file: uploaded });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
