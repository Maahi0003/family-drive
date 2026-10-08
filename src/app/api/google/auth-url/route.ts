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

    const family = await db.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const urlObj = new URL(req.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || urlObj.origin;
    const redirectUri = `${origin}/api/google/callback`;

    const configured = isGoogleConfigured(family);
    if (!configured) {
      return NextResponse.json({
        configured: false,
        redirectUri,
        message: 'Google Cloud OAuth is not yet configured. Please upload client_secret.json or enter Client ID & Secret below.',
      });
    }

    const authUrl = getAuthUrl(familyId, family, redirectUri);
    return NextResponse.json({
      configured: true,
      authUrl,
      redirectUri,
      hasCustomCredentials: Boolean(family.googleClientId),
      clientId: family.googleClientId || undefined,
    });
  } catch (error: any) {
    console.error('Auth url error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
