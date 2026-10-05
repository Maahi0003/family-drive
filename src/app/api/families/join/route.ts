import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await req.json();
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    const family = await db.family.findUnique({
      where: { inviteCode: cleanCode },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Invalid invite code. Family not found.' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({
        message: 'You are already a member of this family',
        familyId: family.id,
      });
    }

    // Join family as MEMBER
    await db.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        role: 'MEMBER',
      },
    });

    // Record activity
    await db.activityLog.create({
      data: {
        familyId: family.id,
        userId: user.id,
        action: 'JOIN',
        targetName: `${user.name} joined the family`,
      },
    });

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        inviteCode: family.inviteCode,
        role: 'MEMBER',
        isOwner: false,
        memberCount: family._count.members + 1,
        driveConnected: family.driveConnected,
        driveRootFolderName: family.driveRootFolderName,
        allowMemberDelete: family.allowMemberDelete,
      },
    });
  } catch (error: any) {
    console.error('Join family error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
