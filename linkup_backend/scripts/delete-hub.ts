/**
 * Permanently delete a hub and all related data.
 *
 * Usage:
 *   npx tsx scripts/delete-hub.ts --name tellus --confirm
 *   npx tsx scripts/delete-hub.ts --id <groupId> --confirm
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  GroupLiveRoomStatus,
  PrismaClient,
} from '../src/generated/prisma/client';
import {
  cleanupLocalUploadFiles,
  collectUniqueMediaUrls,
} from '../src/common/media-cleanup.util';

const CONFIRM = process.argv.includes('--confirm');
const nameArg = getArg('--name');
const idArg = getArg('--id');
const OUTPUT_DIR = join(process.cwd(), 'scripts', 'output', 'hub-delete');

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1]?.trim();
}

function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    if (!parsed.searchParams.has('uselibpqcompat')) {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(connectionString),
    connectionTimeoutMillis: 30_000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

const { prisma, pool } = createPrisma();

async function snapshotGroup(groupId: string) {
  const [
    group,
    members,
    posts,
    messages,
    notifications,
    liveRooms,
  ] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.groupMember.count({ where: { groupId } }),
    prisma.post.count({ where: { groupId } }),
    prisma.groupMessage.count({ where: { groupId } }),
    prisma.notification.count({ where: { groupId } }),
    prisma.groupLiveRoom.count({ where: { groupId } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    group,
    counts: {
      members,
      posts,
      messages,
      notifications,
      liveRooms,
    },
  };
}

async function collectGroupMediaUrls(
  groupId: string,
  coverImage: string | null,
): Promise<string[]> {
  const posts = await prisma.post.findMany({
    where: { groupId },
    select: { imageUrl: true, videoUrl: true },
  });

  return collectUniqueMediaUrls([
    coverImage,
    ...posts.flatMap((post) => [post.imageUrl, post.videoUrl]),
  ]);
}

async function main() {
  if (!nameArg && !idArg) {
    console.error('Provide --name <hubName> or --id <groupId>');
    process.exit(1);
  }

  const group = idArg
    ? await prisma.group.findUnique({ where: { id: idArg } })
    : await prisma.group.findFirst({
        where: { name: { equals: nameArg!, mode: 'insensitive' } },
      });

  if (!group) {
    console.error('Hub not found.');
    process.exit(1);
  }

  const audit = await snapshotGroup(group.id);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const auditPath = join(
    OUTPUT_DIR,
    `pre-delete-${group.name}-${Date.now()}.json`,
  );
  writeFileSync(auditPath, JSON.stringify(audit, null, 2));

  console.log(`Hub: ${group.name} (${group.id})`);
  console.log(`Owner: ${group.ownerId}`);
  console.log(`Audit backup: ${auditPath}`);
  console.log('Counts:', audit.counts);

  if (!CONFIRM) {
    console.log('\nDry run only. Re-run with --confirm to permanently delete.');
    return;
  }

  const owner = await prisma.user.findUnique({
    where: { id: group.ownerId },
    select: { email: true },
  });

  const mediaUrls = await collectGroupMediaUrls(group.id, group.coverImage);

  await prisma.$transaction(async (tx) => {
    await tx.groupLiveRoom.updateMany({
      where: { groupId: group.id, status: GroupLiveRoomStatus.ACTIVE },
      data: { status: GroupLiveRoomStatus.ENDED, endedAt: new Date() },
    });

    await tx.notification.deleteMany({ where: { groupId: group.id } });

    await tx.groupDeletionLog.create({
      data: {
        groupId: group.id,
        groupName: group.name,
        deletedById: group.ownerId,
        deletedByEmail: owner?.email ?? '',
      },
    });

    await tx.group.delete({ where: { id: group.id } });
  });

  const removedFiles = cleanupLocalUploadFiles(mediaUrls);
  const stillExists = await prisma.group.findUnique({
    where: { id: group.id },
    select: { id: true },
  });

  console.log('\nDeleted hub permanently.');
  console.log(`Local media files removed: ${removedFiles}`);
  console.log(`Group still in database: ${stillExists ? 'yes' : 'no'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
