import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateInviteCode } from '@/lib/utils';
import { FamilySummary } from '@/types';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await db.familyMember.findMany({
      where: { userId: user.id },
      include: {
        family: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const families: FamilySummary[] = memberships.map((m) => ({
      id: m.family.id,
      name: m.family.name,
      description: m.family.description,
      inviteCode: m.family.inviteCode,
      role: m.role as 'ADMIN' | 'MEMBER',
      isOwner: m.family.ownerId === user.id,
      memberCount: m.family._count.members,
      driveConnected: m.family.driveConnected,
      driveRootFolderName: m.family.driveRootFolderName,
      allowMemberDelete: m.family.allowMemberDelete,
    }));

    return NextResponse.json({ families });
  } catch (error: any) {
    console.error('Fetch families error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await req.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 });
    }

    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    let existing = await db.family.findUnique({ where: { inviteCode } });
    while (existing) {
      inviteCode = generateInviteCode();
      existing = await db.family.findUnique({ where: { inviteCode } });
    }

    const family = await db.family.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        inviteCode,
        ownerId: user.id,
        driveRootFolderName: `${name.trim()} Drive`,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
        activities: {
          create: {
            userId: user.id,
            action: 'SETTINGS_UPDATE',
            targetName: `Created family "${name.trim()}"`,
          },
        },
      },
    });

    // Seed default starter folders for new family (Vacation, Documents, Family Photos)
    await db.virtualDriveFile.createMany({
      data: [
        {
          familyId: family.id,
          name: 'Family Photos',
          mimeType: 'application/vnd.google-apps.folder',
          isFolder: true,
          size: 0,
          uploaderId: user.id,
        },
        {
          familyId: family.id,
          name: 'Important Documents',
          mimeType: 'application/vnd.google-apps.folder',
          isFolder: true,
          size: 0,
          uploaderId: user.id,
        },
        {
          familyId: family.id,
          name: 'Vacation & Trips',
          mimeType: 'application/vnd.google-apps.folder',
          isFolder: true,
          size: 0,
          uploaderId: user.id,
        },
      ],
    });

    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        inviteCode: family.inviteCode,
        role: 'ADMIN',
        isOwner: true,
        memberCount: 1,
        driveConnected: family.driveConnected,
        driveRootFolderName: family.driveRootFolderName,
        allowMemberDelete: family.allowMemberDelete,
      },
    });
  } catch (error: any) {
    console.error('Create family error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
