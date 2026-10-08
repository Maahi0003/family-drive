import { NextResponse } from 'next/server';

const CURRENT_SERVER_VERSION = '1.0.1';
const LATEST_RELEASE_VERSION = '1.0.1';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientVersion = searchParams.get('current') || CURRENT_SERVER_VERSION;
  const platform = searchParams.get('platform') || 'web'; // 'android' | 'web'

  const hasUpdate = clientVersion !== LATEST_RELEASE_VERSION;

  return NextResponse.json({
    currentVersion: clientVersion,
    latestVersion: LATEST_RELEASE_VERSION,
    updateAvailable: hasUpdate,
    mandatory: false,
    releaseDate: '2026-10-08',
    downloadUrl: 'https://github.com/Maahi0003/family-drive/releases/latest',
    changelog: [
      '⚡ High-speed video streaming & audio preview player',
      '📢 In-app developer broadcast notifications',
      '📱 Android photo picker & direct camera uploads',
      '🔒 Enhanced folder boundary protection',
      '🎨 Refined dark-mode glassmorphic styling',
    ],
  });
}
