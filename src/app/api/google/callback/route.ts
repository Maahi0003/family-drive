import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOAuth2Client } from '@/lib/google-drive';
import { google } from 'googleapis';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const familyId = searchParams.get('state');

    if (!code || !familyId) {
      return NextResponse.redirect(new URL('/?error=invalid_oauth_response', req.url));
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    let driveEmail: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      driveEmail = userInfo.data.email || null;
    } catch (e) {
      console.warn('Could not fetch user email:', e);
    }

    await db.family.update({
      where: { id: familyId },
      data: {
        driveConnected: true,
        driveEmail,
        googleRefreshToken: tokens.refresh_token || undefined,
      },
    });

    await db.activityLog.create({
      data: {
        familyId,
        userId: (await db.family.findUnique({ where: { id: familyId } }))?.ownerId || '',
        action: 'SETTINGS_UPDATE',
        targetName: `Connected Google Drive (${driveEmail || 'Account'})`,
      },
    });

    return NextResponse.redirect(new URL(`/?connected=drive&familyId=${familyId}`, req.url));
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url));
  }
}
