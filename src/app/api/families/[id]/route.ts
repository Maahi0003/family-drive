import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: id,
          userId: user.id,
        },
      },
      include: {
        family: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this family' }, { status: 403 });
    }

    const family = membership.family;

    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        inviteCode: family.inviteCode,
        role: membership.role,
        isOwner: family.ownerId === user.id,
        memberCount: family._count.members,
        driveConnected: family.driveConnected,
        driveEmail: family.driveEmail,
        driveRootFolderId: family.driveRootFolderId,
        driveRootFolderName: family.driveRootFolderName,
        allowMemberDelete: family.allowMemberDelete,
      },
    });
  } catch (error: any) {
    console.error('Get family error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user is an ADMIN of this family
    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: id,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update family settings' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.allowMemberDelete !== undefined) updateData.allowMemberDelete = Boolean(body.allowMemberDelete);
    if (body.driveRootFolderId !== undefined) updateData.driveRootFolderId = body.driveRootFolderId;
    if (body.driveRootFolderName !== undefined) updateData.driveRootFolderName = body.driveRootFolderName;

    const updated = await db.family.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        familyId: id,
        userId: user.id,
        action: 'SETTINGS_UPDATE',
        targetName: 'Updated family settings',
      },
    });

    return NextResponse.json({
      family: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        inviteCode: updated.inviteCode,
        role: 'ADMIN',
        allowMemberDelete: updated.allowMemberDelete,
        driveConnected: updated.driveConnected,
        driveRootFolderId: updated.driveRootFolderId,
        driveRootFolderName: updated.driveRootFolderName,
      },
    });
  } catch (error: any) {
    console.error('Update family error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
