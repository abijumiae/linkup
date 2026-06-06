/**
 * Complete platform reset — keep a single user account and remove everything else.
 *
 * Usage:
 *   npx tsx scripts/reset-platform.ts
 *   npx tsx scripts/reset-platform.ts --confirm
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

const KEEP_EMAIL = 'abijumi.ae@gmail.com'.toLowerCase();
const CONFIRM = process.argv.includes('--confirm');
const OUTPUT_DIR = join(process.cwd(), 'scripts', 'output', 'platform-reset');

const PG_DUMP_PATHS = [
  'pg_dump',
  '/opt/homebrew/bin/pg_dump',
  '/usr/local/bin/pg_dump',
  '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
];

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

function resolvePgDump(): string | null {
  for (const candidate of PG_DUMP_PATHS) {
    try {
      execSync(`"${candidate}" --version`, { stdio: 'pipe' });
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

async function snapshotCounts() {
  const [
    users,
    posts,
    messages,
    groups,
    notifications,
    comments,
    likes,
    follows,
    moments,
    jobs,
    events,
    marketplaceItems,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.message.count(),
    prisma.group.count(),
    prisma.notification.count(),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.follow.count(),
    prisma.moment.count(),
    prisma.job.count(),
    prisma.event.count(),
    prisma.marketplaceItem.count(),
  ]);

  return {
    users,
    posts,
    messages,
    groups,
    notifications,
    comments,
    likes,
    follows,
    moments,
    jobs,
    events,
    marketplaceItems,
  };
}

async function createJsonTableBackup() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(OUTPUT_DIR, `json-table-backup-${stamp}.json`);

  const [users, posts, messages, groups, notifications] = await Promise.all([
    prisma.user.findMany(),
    prisma.post.findMany(),
    prisma.message.findMany(),
    prisma.group.findMany(),
    prisma.notification.findMany(),
  ]);

  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        users,
        posts,
        messages,
        groups,
        notifications,
      },
      null,
      2,
    ),
  );

  return backupPath;
}

function createSqlBackup(databaseUrl: string): string | null {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(OUTPUT_DIR, `full-backup-before-reset-${stamp}.sql`);
  const pgDump = resolvePgDump();

  if (!pgDump) {
    return null;
  }

  execSync(
    `"${pgDump}" "${databaseUrl}" --no-owner --no-acl --clean --if-exists -f "${backupPath}"`,
    { stdio: 'pipe', env: process.env },
  );

  return backupPath;
}

async function exportPreResetAudit(keepUserId: string) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const [allUsers, counts, keepUser] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    snapshotCounts(),
    prisma.user.findUnique({
      where: { id: keepUserId },
      include: {
        _count: {
          select: {
            posts: true,
            sentMessages: true,
            receivedMessages: true,
            ownedGroups: true,
            notificationsReceived: true,
          },
        },
      },
    }),
  ]);

  const exportPath = join(OUTPUT_DIR, `pre-reset-audit-${stamp}.json`);
  writeFileSync(
    exportPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        keepEmail: KEEP_EMAIL,
        keepUser,
        usersToDelete: allUsers.filter((u) => u.id !== keepUserId),
        countsBefore: counts,
      },
      null,
      2,
    ),
  );

  return exportPath;
}

function cleanupLocalUploads(mediaUrls: string[]) {
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) return 0;

  let removed = 0;
  for (const url of mediaUrls) {
    if (!url.startsWith('/uploads/')) continue;
    const filePath = join(process.cwd(), url.replace(/^\//, ''));
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        removed += 1;
      } catch {
        // ignore
      }
    }
  }
  return removed;
}

async function collectMediaUrlsForDeletedUsers(keepUserId: string) {
  const users = await prisma.user.findMany({
    where: { id: { not: keepUserId } },
    select: { avatarUrl: true, coverUrl: true },
  });

  const posts = await prisma.post.findMany({
    where: { authorId: { not: keepUserId } },
    select: { imageUrl: true, videoUrl: true },
  });

  const messages = await prisma.message.findMany({
    where: {
      AND: [
        { senderId: { not: keepUserId } },
        { receiverId: { not: keepUserId } },
      ],
    },
    select: { mediaUrl: true },
  });

  const moments = await prisma.moment.findMany({
    where: { userId: { not: keepUserId } },
    select: { mediaUrl: true },
  });

  const urls = new Set<string>();
  const add = (url: string | null | undefined) => {
    if (url?.trim()) urls.add(url.trim());
  };

  for (const u of users) {
    add(u.avatarUrl);
    add(u.coverUrl);
  }
  for (const p of posts) {
    add(p.imageUrl);
    add(p.videoUrl);
  }
  for (const m of messages) add(m.mediaUrl);
  for (const mo of moments) add(mo.mediaUrl);

  return [...urls];
}

async function getExistingTables(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;
  return new Set(rows.map((row) => row.tablename));
}

function hasTable(tables: Set<string>, name: string): boolean {
  return tables.has(name);
}

async function performReset(keepUserId: string) {
  const tables = await getExistingTables();
  await prisma.user.update({
    where: { id: keepUserId },
    data: {
      role: 'ADMIN',
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const otherGroupIds = (
    await prisma.group.findMany({
      where: { ownerId: { not: keepUserId } },
      select: { id: true },
    })
  ).map((g) => g.id);

  await prisma.$transaction(
    async (tx) => {
      await tx.notification.deleteMany({});

      if (otherGroupIds.length > 0) {
        await tx.post.deleteMany({
          where: { groupId: { in: otherGroupIds } },
        });
      }

      await tx.comment.deleteMany({ where: { authorId: { not: keepUserId } } });
      await tx.like.deleteMany({ where: { userId: { not: keepUserId } } });
      if (hasTable(tables, 'PostReaction')) {
        await tx.postReaction.deleteMany({ where: { userId: { not: keepUserId } } });
      }
      if (hasTable(tables, 'MessageReaction')) {
        await tx.messageReaction.deleteMany({
          where: { userId: { not: keepUserId } },
        });
      }
      await tx.savedPost.deleteMany({ where: { userId: { not: keepUserId } } });

      await tx.post.deleteMany({ where: { authorId: { not: keepUserId } } });

      await tx.message.deleteMany({
        where: {
          AND: [
            { senderId: { not: keepUserId } },
            { receiverId: { not: keepUserId } },
          ],
        },
      });

      await tx.groupMessage.deleteMany({ where: { senderId: { not: keepUserId } } });
      if (hasTable(tables, 'GroupLiveTalkMessage')) {
        await tx.groupLiveTalkMessage.deleteMany({
          where: { userId: { not: keepUserId } },
        });
      }
      if (hasTable(tables, 'GroupLiveParticipant')) {
        await tx.groupLiveParticipant.deleteMany({
          where: { userId: { not: keepUserId } },
        });
      }
      if (hasTable(tables, 'GroupLiveRoom')) {
        await tx.groupLiveRoom.updateMany({
          where: { activeMicUserId: { not: keepUserId } },
          data: { activeMicUserId: null },
        });
      }

      await tx.groupMember.deleteMany({ where: { userId: { not: keepUserId } } });
      await tx.group.deleteMany({ where: { ownerId: { not: keepUserId } } });

      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: { not: keepUserId } },
            { followingId: { not: keepUserId } },
          ],
        },
      });

      await tx.block.deleteMany({
        where: {
          OR: [
            { blockerId: { not: keepUserId } },
            { blockedId: { not: keepUserId } },
          ],
        },
      });

      await tx.jobApplication.deleteMany({
        where: { applicantId: { not: keepUserId } },
      });
      await tx.job.deleteMany({ where: { posterId: { not: keepUserId } } });

      await tx.eventAttendee.deleteMany({ where: { userId: { not: keepUserId } } });
      await tx.event.deleteMany({ where: { organizerId: { not: keepUserId } } });

      await tx.marketplaceItem.deleteMany({
        where: { sellerId: { not: keepUserId } },
      });

      if (hasTable(tables, 'Moment')) {
        await tx.moment.deleteMany({ where: { userId: { not: keepUserId } } });
      }
      if (hasTable(tables, 'WatchProgress')) {
        await tx.watchProgress.deleteMany({ where: { userId: { not: keepUserId } } });
      }
      if (hasTable(tables, 'WatchVideo')) {
        await tx.watchVideo.deleteMany({
          where: {
            OR: [{ creatorId: { not: keepUserId } }, { creatorId: null }],
          },
        });
      }

      await tx.report.deleteMany({ where: { reporterId: { not: keepUserId } } });
      await tx.moderationLog.deleteMany({ where: { adminId: { not: keepUserId } } });

      await tx.user.deleteMany({ where: { id: { not: keepUserId } } });
    },
    { timeout: 120_000 },
  );
}

async function rebuildIndexes() {
  await prisma.$executeRawUnsafe('VACUUM ANALYZE');
}

async function verifyOrphans() {
  const checks = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Comment" c
      WHERE NOT EXISTS (SELECT 1 FROM "Post" p WHERE p.id = c."postId")
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Like" l
      WHERE NOT EXISTS (SELECT 1 FROM "Post" p WHERE p.id = l."postId")
         OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = l."userId")
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Message" m
      WHERE NOT EXISTS (SELECT 1 FROM "User" s WHERE s.id = m."senderId")
         OR NOT EXISTS (SELECT 1 FROM "User" r WHERE r.id = m."receiverId")
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Notification" n
      WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = n."recipientId")
         OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = n."actorId")
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Follow" f
      WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = f."followerId")
         OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = f."followingId")
    `,
  ]);

  return {
    orphanComments: Number(checks[0][0]?.count ?? 0),
    orphanLikes: Number(checks[1][0]?.count ?? 0),
    orphanMessages: Number(checks[2][0]?.count ?? 0),
    orphanNotifications: Number(checks[3][0]?.count ?? 0),
    orphanFollows: Number(checks[4][0]?.count ?? 0),
  };
}

async function verifyApi() {
  let healthOk = false;
  let loginStatus = 0;

  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    healthOk = healthRes.ok;
  } catch {
    healthOk = false;
  }

  try {
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: KEEP_EMAIL,
        password: process.env.RESET_VERIFY_PASSWORD ?? '__skip_password_check__',
      }),
    });
    loginStatus = loginRes.status;
  } catch {
    loginStatus = 0;
  }

  return { healthOk, loginStatus };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const keepUser = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
    },
  });

  if (!keepUser) {
    throw new Error(`Keep user not found: ${KEEP_EMAIL}`);
  }

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, username: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  const usersToDelete = allUsers.filter((u) => u.id !== keepUser.id);
  const countsBefore = await snapshotCounts();

  console.log('\n=== LinkUp platform reset ===\n');
  console.log(`KEEP: ${keepUser.email} (@${keepUser.username}) [${keepUser.role}]`);
  console.log(`Users to delete: ${usersToDelete.length}`);
  console.log('Counts before reset:');
  console.log(JSON.stringify(countsBefore, null, 2));

  console.log('\n--- Accounts that will be DELETED ---');
  for (const u of usersToDelete) {
    console.log(`• ${u.email} (@${u.username}) [${u.role}]`);
  }

  const auditPath = await exportPreResetAudit(keepUser.id);
  console.log(`\nPre-reset audit exported: ${auditPath}`);

  if (!CONFIRM) {
    console.log(
      '\nDry-run complete. Re-run with --confirm to backup and reset the platform.',
    );
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  let sqlBackupPath: string | null = null;
  try {
    const jsonBackupPath = await createJsonTableBackup();
    console.log(`\nJSON table backup: ${jsonBackupPath}`);

    sqlBackupPath = createSqlBackup(databaseUrl);
    if (sqlBackupPath) {
      console.log(`Full SQL backup: ${sqlBackupPath}`);
    } else {
      console.warn(
        'pg_dump not found — SQL dump skipped. JSON table backup + audit export are available.',
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Backup failed — aborting reset: ${message}`);
  }

  const mediaUrls = await collectMediaUrlsForDeletedUsers(keepUser.id);
  writeFileSync(
    join(OUTPUT_DIR, `deleted-user-media-urls-${Date.now()}.json`),
    JSON.stringify(mediaUrls, null, 2),
  );

  console.log('\nPerforming platform reset...');
  await performReset(keepUser.id);

  const removedFiles = cleanupLocalUploads(mediaUrls);
  console.log(`Removed ${removedFiles} local upload file(s) from deleted users.`);

  console.log('Rebuilding database statistics (VACUUM ANALYZE)...');
  await rebuildIndexes();

  const orphans = await verifyOrphans();
  const countsAfter = await snapshotCounts();
  const finalUser = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isVerified: true,
      isEmailVerified: true,
      _count: {
        select: {
          posts: true,
          sentMessages: true,
          receivedMessages: true,
          ownedGroups: true,
        },
      },
    },
  });

  const api = await verifyApi();

  console.log('\n=== Reset complete ===');
  console.log(`Remaining users: ${countsAfter.users}`);
  console.log('Final keep account:');
  console.log(JSON.stringify(finalUser, null, 2));
  console.log('Counts after reset:');
  console.log(JSON.stringify(countsAfter, null, 2));
  console.log('Orphan check:');
  console.log(JSON.stringify(orphans, null, 2));
  console.log('API verification:');
  console.log(
    JSON.stringify(
      {
        healthOk: api.healthOk,
        loginEndpointReachable: api.loginStatus > 0,
        loginStatus: api.loginStatus,
        loginNote:
          api.loginStatus === 401
            ? 'Login endpoint works (401 expected without correct password)'
            : api.loginStatus === 200
              ? 'Login succeeded with RESET_VERIFY_PASSWORD'
              : 'Set RESET_VERIFY_PASSWORD in .env to verify credentials',
      },
      null,
      2,
    ),
  );

  if (sqlBackupPath) {
    console.log(`SQL backup: ${sqlBackupPath}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
