import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDriveClientForFamily, isGoogleConfigured } from '@/lib/google-drive';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: fileId } = params;
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');
    const isInline = searchParams.get('inline') === 'true';

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
      include: { family: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const family = membership.family;

    // Real Google Drive download
    if (family.driveConnected && family.googleRefreshToken && isGoogleConfigured()) {
      try {
        const drive = await getDriveClientForFamily(familyId);
        if (drive) {
          const fileMeta = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size',
          });

          const res = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
          );

          const disposition = isInline ? 'inline' : `attachment; filename="${encodeURIComponent(fileMeta.data.name || 'file')}"`;

          return new NextResponse(res.data as ArrayBuffer, {
            headers: {
              'Content-Type': fileMeta.data.mimeType || 'application/octet-stream',
              'Content-Disposition': disposition,
            },
          });
        }
      } catch (err: any) {
        console.error('Google Drive download error, falling back to virtual files:', err.message);
      }
    }

    // Sandbox virtual files download with strict tenant boundary check
    const virtualItem = await db.virtualDriveFile.findFirst({
      where: { id: fileId, familyId },
    });

    if (!virtualItem) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 });
    }

    if (virtualItem.contentPath) {
      const fullPath = path.join(process.cwd(), 'public', 'uploads', virtualItem.contentPath);
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        const disposition = isInline ? 'inline' : `attachment; filename="${encodeURIComponent(virtualItem.name)}"`;

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': virtualItem.mimeType || 'application/octet-stream',
            'Content-Disposition': disposition,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }
    }

    // If text file or demo placeholder, return synthesized content
    const sampleContent = Buffer.from(`Family Drive File: ${virtualItem.name}\nUploaded by: ${user.name}`);
    return new NextResponse(sampleContent, {
      headers: {
        'Content-Type': virtualItem.mimeType || 'text/plain',
        'Content-Disposition': isInline ? 'inline' : `attachment; filename="${encodeURIComponent(virtualItem.name)}"`,
      },
    });
  } catch (error: any) {
    console.error('Download file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
