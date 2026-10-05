import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteDriveItem, updateDriveFile } from '@/lib/google-drive';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = params;
    const formData = await req.formData();
    const familyId = formData.get('familyId') as string;
    const name = (formData.get('name') as string) || undefined;
    const description = formData.get('description') !== null ? (formData.get('description') as string) : undefined;
    const file = formData.get('file') as File | null;

    if (!familyId || !itemId || !file) {
      return NextResponse.json({ error: 'familyId, itemId, and file are required' }, { status: 400 });
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

    const updated = await updateDriveFile(
      familyId,
      itemId,
      {
        name: name || file.name,
        type: file.type || 'image/jpeg',
        size: file.size,
        buffer,
        description,
      },
      user.id
    );

    await db.activityLog.create({
      data: {
        familyId,
        userId: user.id,
        action: 'SETTINGS_UPDATE',
        targetName: `Edited and updated "${updated.name}"`,
      },
    });

    return NextResponse.json({ file: updated });
  } catch (error: any) {
    console.error('Update file error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = params;
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');

    if (!familyId || !itemId) {
      return NextResponse.json({ error: 'familyId and itemId are required' }, { status: 400 });
    }

    // Verify membership & permissions
    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.id,
        },
      },
      include: {
        family: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this family' }, { status: 403 });
    }

    if (membership.role !== 'ADMIN' && !membership.family.allowMemberDelete) {
      return NextResponse.json(
        { error: 'File deletion has been disabled for members by the Family Admin' },
        { status: 403 }
      );
    }

    // Find item name for activity logging before deleting
    let itemName = 'item';
    const virtualItem = await db.virtualDriveFile.findUnique({ where: { id: itemId } });
    if (virtualItem) {
      itemName = virtualItem.name;
    }

    await deleteDriveItem(familyId, itemId);

    await db.activityLog.create({
      data: {
        familyId,
        userId: user.id,
        action: 'DELETE',
        targetName: `Deleted "${itemName}"`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
