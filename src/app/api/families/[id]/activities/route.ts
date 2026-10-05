import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ActivityItem } from '@/types';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: familyId } = params;

    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activities = await db.activityLog.findMany({
      where: { familyId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    const list: ActivityItem[] = activities.map((a) => ({
      id: a.id,
      action: a.action as any,
      targetName: a.targetName,
      userName: a.user.name,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ activities: list });
  } catch (error: any) {
    console.error('Activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
