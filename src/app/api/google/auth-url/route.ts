import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAuthUrl, isGoogleConfigured } from '@/lib/google-drive';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    const membership = await db.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can connect Google Drive' }, { status: 403 });
    }

    if (!isGoogleConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Google Cloud OAuth is not configured in .env. Running in Sandbox / Demo mode.',
      });
    }

    const authUrl = getAuthUrl(familyId);
    return NextResponse.json({
      configured: true,
      authUrl,
    });
  } catch (error: any) {
    console.error('Auth url error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
