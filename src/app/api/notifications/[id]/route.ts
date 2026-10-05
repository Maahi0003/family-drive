import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { read } = await req.json();

    const notif = await db.notification.findUnique({
      where: { id },
    });

    if (!notif || notif.userId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { read: read !== undefined ? Boolean(read) : true },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
