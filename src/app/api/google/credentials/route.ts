import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseGoogleCredentialsJson } from '@/lib/google-drive';

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

    const family = await db.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const urlObj = new URL(req.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || urlObj.origin;
    const redirectUri = `${origin}/api/google/callback`;

    return NextResponse.json({
      hasCustomCredentials: Boolean(family.googleClientId && family.googleClientSecret),
      clientId: family.googleClientId || null,
      driveConnected: family.driveConnected,
      driveEmail: family.driveEmail || null,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Get credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { familyId, clientId: rawClientId, clientSecret: rawClientSecret, jsonContent } = body;

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
      return NextResponse.json({ error: 'Only family admins can configure Google credentials' }, { status: 403 });
    }

    let clientId = (rawClientId || '').trim();
    let clientSecret = (rawClientSecret || '').trim();

    // If jsonContent was provided (from uploaded credentials.json file), parse it
    if (jsonContent) {
      const parsed = parseGoogleCredentialsJson(jsonContent);
      if (!parsed || !parsed.clientId || !parsed.clientSecret) {
        return NextResponse.json(
          { error: 'Invalid Google client_secret.json format. Please ensure it contains client_id and client_secret.' },
          { status: 400 }
        );
      }
      clientId = parsed.clientId;
      clientSecret = parsed.clientSecret;
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Both Client ID and Client Secret are required' }, { status: 400 });
    }

    await db.family.update({
      where: { id: familyId },
      data: {
        googleClientId: clientId,
        googleClientSecret: clientSecret,
      },
    });

    const urlObj = new URL(req.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || urlObj.origin;
    const redirectUri = `${origin}/api/google/callback`;

    return NextResponse.json({
      success: true,
      message: 'Google Cloud credentials saved for this family successfully!',
      clientId,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Save credentials error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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
      return NextResponse.json({ error: 'Only admins can disconnect Google Drive' }, { status: 403 });
    }

    await db.family.update({
      where: { id: familyId },
      data: {
        driveConnected: false,
        driveEmail: null,
        googleRefreshToken: null,
        googleClientId: null,
        googleClientSecret: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Drive disconnected and credentials removed',
    });
  } catch (error: any) {
    console.error('Delete credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
