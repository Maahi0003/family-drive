import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateInviteCode } from '@/lib/utils';

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can regenerate the invite code' }, { status: 403 });
    }

    let newCode = generateInviteCode();
    let existing = await db.family.findUnique({ where: { inviteCode: newCode } });
    while (existing) {
      newCode = generateInviteCode();
      existing = await db.family.findUnique({ where: { inviteCode: newCode } });
    }

    await db.family.update({
      where: { id },
      data: { inviteCode: newCode },
    });

    return NextResponse.json({ inviteCode: newCode });
  } catch (error: any) {
    console.error('Regenerate invite code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
