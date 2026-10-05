import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { MemberItem } from '@/types';

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
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await db.familyMember.findMany({
      where: { familyId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const memberList: MemberItem[] = members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role as 'ADMIN' | 'MEMBER',
      joinedAt: m.joinedAt.toISOString(),
    }));

    return NextResponse.json({ members: memberList });
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target userId is required' }, { status: 400 });
    }

    const callerMembership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: id,
          userId: user.id,
        },
      },
    });

    if (!callerMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // User can remove themselves (leave family) or admin can remove any member
    if (callerMembership.userId !== targetUserId && callerMembership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove other members' }, { status: 403 });
    }

    // If owner tries to leave, prevent or require transfer
    const family = await db.family.findUnique({ where: { id } });
    if (family?.ownerId === targetUserId) {
      return NextResponse.json({ error: 'Family owner cannot leave the family. Delete or transfer first.' }, { status: 400 });
    }

    await db.familyMember.delete({
      where: {
        familyId_userId: {
          familyId: id,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
