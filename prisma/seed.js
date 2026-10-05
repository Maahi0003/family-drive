const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FamilyDrive database with sample dataset...');

  // Clean existing records if any
  await prisma.notification.deleteMany();
  await prisma.systemBroadcast.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.virtualDriveFile.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Demo Users
  const dad = await prisma.user.create({
    data: {
      name: 'John Anderson (Dad)',
      email: 'john.dad@example.com',
      passwordHash,
    },
  });

  const mom = await prisma.user.create({
    data: {
      name: 'Sarah Anderson (Mom)',
      email: 'sarah.mom@example.com',
      passwordHash,
    },
  });

  const alex = await prisma.user.create({
    data: {
      name: 'Alex Anderson (Kid)',
      email: 'alex.kid@example.com',
      passwordHash,
    },
  });

  console.log('Created demo users: John (Dad), Sarah (Mom), Alex (Kid)');

  // 2. Create Family 1: The Anderson Family
  const andersonFamily = await prisma.family.create({
    data: {
      name: 'The Anderson Family',
      description: 'Shared family photos, trips, and household documents',
      inviteCode: 'FAM-8K4T9M',
      ownerId: dad.id,
      driveConnected: false, // Sandbox mode
      driveRootFolderName: 'Anderson Family Drive',
      allowMemberDelete: true,
      members: {
        create: [
          { userId: dad.id, role: 'ADMIN' },
          { userId: mom.id, role: 'MEMBER' },
          { userId: alex.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // 3. Create Family 2: Lake Tahoe Cabin Group
  const tahoeFamily = await prisma.family.create({
    data: {
      name: 'Lake Tahoe Cabin Group',
      description: 'Cousins and in-laws trip planning and photos',
      inviteCode: 'FAM-9X2L4K',
      ownerId: mom.id,
      driveConnected: false,
      driveRootFolderName: 'Tahoe Trip Drive',
      allowMemberDelete: false,
      members: {
        create: [
          { userId: mom.id, role: 'ADMIN' },
          { userId: dad.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // 4. Create Folders and Files in Anderson Family
  const vacationFolder = await prisma.virtualDriveFile.create({
    data: {
      familyId: andersonFamily.id,
      name: 'Summer Vacation 2024',
      mimeType: 'application/vnd.google-apps.folder',
      isFolder: true,
      size: 0,
      uploaderId: dad.id,
    },
  });

  const docsFolder = await prisma.virtualDriveFile.create({
    data: {
      familyId: andersonFamily.id,
      name: 'Important Documents',
      mimeType: 'application/vnd.google-apps.folder',
      isFolder: true,
      size: 0,
      uploaderId: mom.id,
    },
  });

  const artworkFolder = await prisma.virtualDriveFile.create({
    data: {
      familyId: andersonFamily.id,
      name: 'School & Kids Artwork',
      mimeType: 'application/vnd.google-apps.folder',
      isFolder: true,
      size: 0,
      uploaderId: alex.id,
    },
  });

  // Files inside Vacation Folder
  await prisma.virtualDriveFile.createMany({
    data: [
      {
        familyId: andersonFamily.id,
        name: 'sunset_beach_panorama.jpg',
        mimeType: 'image/jpeg',
        size: 3450000,
        isFolder: false,
        parentId: vacationFolder.id,
        uploaderId: dad.id,
      },
      {
        familyId: andersonFamily.id,
        name: 'family_dinner_video.mp4',
        mimeType: 'video/mp4',
        size: 18450000,
        isFolder: false,
        parentId: vacationFolder.id,
        uploaderId: mom.id,
      },
      {
        familyId: andersonFamily.id,
        name: 'airline_flight_tickets.pdf',
        mimeType: 'application/pdf',
        size: 840000,
        isFolder: false,
        parentId: vacationFolder.id,
        uploaderId: dad.id,
      },
      {
        familyId: andersonFamily.id,
        name: 'vacation_playlist.mp3',
        mimeType: 'audio/mpeg',
        size: 6100000,
        isFolder: false,
        parentId: vacationFolder.id,
        uploaderId: alex.id,
      },
    ],
  });

  // Files inside Documents Folder
  await prisma.virtualDriveFile.createMany({
    data: [
      {
        familyId: andersonFamily.id,
        name: 'Home_Insurance_Policy_2024.pdf',
        mimeType: 'application/pdf',
        size: 1250000,
        isFolder: false,
        parentId: docsFolder.id,
        uploaderId: mom.id,
      },
      {
        familyId: andersonFamily.id,
        name: 'Emergency_Contact_Numbers.txt',
        mimeType: 'text/plain',
        size: 1400,
        isFolder: false,
        parentId: docsFolder.id,
        uploaderId: dad.id,
      },
    ],
  });

  // 5. Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        familyId: andersonFamily.id,
        userId: dad.id,
        action: 'SETTINGS_UPDATE',
        targetName: 'Created family "The Anderson Family"',
      },
      {
        familyId: andersonFamily.id,
        userId: mom.id,
        action: 'JOIN',
        targetName: 'Sarah joined the family',
      },
      {
        familyId: andersonFamily.id,
        userId: alex.id,
        action: 'JOIN',
        targetName: 'Alex joined the family',
      },
      {
        familyId: andersonFamily.id,
        userId: dad.id,
        action: 'CREATE_FOLDER',
        targetName: 'Created folder "Summer Vacation 2024"',
      },
      {
        familyId: andersonFamily.id,
        userId: dad.id,
        action: 'UPLOAD',
        targetName: 'Uploaded "sunset_beach_panorama.jpg"',
      },
      {
        familyId: andersonFamily.id,
        userId: mom.id,
        action: 'UPLOAD',
        targetName: 'Uploaded "family_dinner_video.mp4"',
      },
    ],
  });

  // 6. Developer Broadcast & Notifications
  const broadcast = await prisma.systemBroadcast.create({
    data: {
      title: 'Welcome to FamilyDrive v1.0.0!',
      message: 'Your shared family Google Drive hub is ready. You can view, upload, delete, and preview files seamlessly.',
      severity: 'success',
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: dad.id,
        title: broadcast.title,
        message: broadcast.message,
        severity: broadcast.severity,
        read: false,
      },
      {
        userId: mom.id,
        title: broadcast.title,
        message: broadcast.message,
        severity: broadcast.severity,
        read: false,
      },
      {
        userId: alex.id,
        title: broadcast.title,
        message: broadcast.message,
        severity: broadcast.severity,
        read: false,
      },
      {
        userId: dad.id,
        title: 'Developer Announcement: Video Streaming Available',
        message: 'You can now stream MP4 videos directly in the file preview lightbox!',
        severity: 'info',
        read: false,
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
