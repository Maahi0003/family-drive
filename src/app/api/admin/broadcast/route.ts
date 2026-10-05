import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, severity = 'info', targetFamilyId } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Authorization check: User must be an Admin
    if (targetFamilyId) {
      const membership = await db.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: targetFamilyId,
            userId: user.id,
          },
        },
      });
      if (!membership || membership.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only family admins can send family broadcasts' }, { status: 403 });
      }
    } else {
      const adminRole = await db.familyMember.findFirst({
        where: { userId: user.id, role: 'ADMIN' },
      });
      if (!adminRole) {
        return NextResponse.json({ error: 'Admin privileges required for system broadcast' }, { status: 403 });
      }
    }

    // Record the system broadcast
    const broadcast = await db.systemBroadcast.create({
      data: {
        title,
        message,
        severity,
        targetFamilyId: targetFamilyId || null,
      },
    });

    // Determine target users
    let targetUserIds: string[] = [];
    if (targetFamilyId) {
      const members = await db.familyMember.findMany({
        where: { familyId: targetFamilyId },
        select: { userId: true },
      });
      targetUserIds = members.map((m) => m.userId);
    } else {
      const allUsers = await db.user.findMany({ select: { id: true } });
      targetUserIds = allUsers.map((u) => u.id);
    }

    // Create notifications for all target users
    if (targetUserIds.length > 0) {
      await db.notification.createMany({
        data: targetUserIds.map((userId) => ({
          userId,
          title,
          message,
          severity,
          read: false,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      broadcast,
      recipientsCount: targetUserIds.length,
    });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
