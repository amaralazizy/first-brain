/**
 * Seed script — populates the tasks table with a realistic distribution of
 * tasks so the heuristic scorer has meaningful signal to rank.
 *
 * Run from the web/ directory:
 *   pnpm seed
 */

import 'dotenv/config';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env.production'), override: false });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tasks } from '@first-brain/db';
import * as schema from '../../packages/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

const seedTasks: (typeof tasks.$inferInsert)[] = [
  // ── Overdue + Critical → should rank #1 ─────────────────────────────────
  {
    title: 'Submit project report to supervisor',
    description: 'Final write-up for ECE 570 — overdue since yesterday.',
    urgency: 'Critical',
    taskType: 'work',
    estimatedEffort: 4,
    hasDeadline: true,
    deadline: daysAgo(1),
    skipCount: 0,
    createdAt: daysAgo(20),
  },

  // ── High urgency, deadline in 2 days ─────────────────────────────────────
  {
    title: 'Fix authentication bug in production',
    description: 'Users are unable to log in on mobile. Hotfix needed.',
    urgency: 'High',
    taskType: 'work',
    estimatedEffort: 3,
    hasDeadline: true,
    deadline: daysFromNow(2),
    skipCount: 0,
    createdAt: daysAgo(5),
  },

  // ── High urgency, deadline in 5 days, skipped twice (penalty) ────────────
  {
    title: 'Prepare presentation slides',
    description: 'Conference talk — 20 slides needed.',
    urgency: 'High',
    taskType: 'work',
    estimatedEffort: 5,
    hasDeadline: true,
    deadline: daysFromNow(5),
    skipCount: 2,
    createdAt: daysAgo(12),
  },

  // ── Medium urgency, old task (age boosts it) ─────────────────────────────
  {
    title: 'Refactor recommendation engine API',
    description: 'Clean up the Python FastAPI wrapper and add OpenAPI docs.',
    urgency: 'Medium',
    taskType: 'work',
    estimatedEffort: 6,
    hasDeadline: false,
    skipCount: 1,
    createdAt: daysAgo(28),
  },

  // ── Medium urgency, deadline in 3 days ───────────────────────────────────
  {
    title: 'Complete online course module 4',
    description: 'Deep Learning specialization — quiz due soon.',
    urgency: 'Medium',
    taskType: 'learning',
    estimatedEffort: 2,
    hasDeadline: true,
    deadline: daysFromNow(3),
    skipCount: 0,
    createdAt: daysAgo(7),
  },

  // ── Medium urgency, no deadline, recent ──────────────────────────────────
  {
    title: 'Write unit tests for feature pipeline',
    description: 'Cover edge cases in features.py for the recommendation engine.',
    urgency: 'Medium',
    taskType: 'work',
    estimatedEffort: 3,
    hasDeadline: false,
    skipCount: 0,
    createdAt: daysAgo(3),
  },

  // ── Low urgency, old + no deadline → age factor keeps it visible ─────────
  {
    title: 'Read "Designing Data-Intensive Applications"',
    description: 'Chapter 5–7 on replication and partitioning.',
    urgency: 'Low',
    taskType: 'learning',
    estimatedEffort: 2,
    hasDeadline: false,
    skipCount: 3,
    createdAt: daysAgo(30),
  },

  // ── Health task, High urgency ─────────────────────────────────────────────
  {
    title: 'Schedule annual physical checkup',
    description: 'Overdue by 6 months.',
    urgency: 'High',
    taskType: 'health',
    estimatedEffort: 1,
    hasDeadline: false,
    skipCount: 4,
    createdAt: daysAgo(45),
  },

  // ── Low urgency, fresh, no deadline → should rank last ───────────────────
  {
    title: 'Reorganise bookmarks folder',
    urgency: 'Low',
    taskType: 'personal',
    estimatedEffort: 1,
    hasDeadline: false,
    skipCount: 0,
    createdAt: daysAgo(1),
  },

  // ── Critical, far deadline ────────────────────────────────────────────────
  {
    title: 'File scholarship renewal application',
    description: 'Purdue graduate fellowship — requires two letters of rec.',
    urgency: 'Critical',
    taskType: 'personal',
    estimatedEffort: 3,
    hasDeadline: true,
    deadline: daysFromNow(14),
    skipCount: 0,
    createdAt: daysAgo(8),
  },
];

async function seed() {
  console.log(`Seeding ${seedTasks.length} tasks…`);

  // Clear existing tasks so the seed is idempotent
  await db.delete(tasks);
  console.log('  ✓ Cleared existing tasks');

  await db.insert(tasks).values(seedTasks);
  console.log('  ✓ Inserted seed tasks');

  console.log('\nExpected ranking (approximate):');
  console.log('  1. Submit project report       — Critical + overdue');
  console.log('  2. Fix authentication bug       — High + 2-day deadline');
  console.log('  3. File scholarship application — Critical + far deadline + age');
  console.log('  4. Schedule physical checkup    — High + very old + 4 skips (penalty)');
  console.log('  5. Prepare presentation slides  — High + 5-day deadline + 2 skips');

  await client.end();
  console.log('\nDone.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
