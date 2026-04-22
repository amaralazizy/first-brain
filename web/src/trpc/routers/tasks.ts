import { eq, and, ne } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import { db, tasks } from '@first-brain/db';
import { createTaskSchema, taskIdSchema } from '@first-brain/validation';

const ML_API = process.env.ML_API_URL ?? 'http://localhost:8000';
const DAY_MS = 86_400_000;

// ── Category mappings (DB → training vocabulary) ─────────────────────────────
// The XGBoost model was trained on simulation data with these exact categories.

const URGENCY_MAP: Record<string, string> = {
  Low: 'Low', Medium: 'Medium', High: 'High',
  Critical: 'High', // nearest known class
};

const TASK_TYPE_MAP: Record<string, string> = {
  work: 'Do', personal: 'Life', learning: 'Learn',
  health: 'Life', other: 'Do',
};

// ── Feature computation ───────────────────────────────────────────────────────

function toFeatures(task: typeof tasks.$inferSelect, now: number) {
  const daysSinceCreation = (now - task.createdAt.getTime()) / DAY_MS;
  const lastSeen = task.lastInteractedAt ?? task.createdAt;
  const daysSinceLastInteraction = (now - lastSeen.getTime()) / DAY_MS;

  let daysUntilDeadline = 0;
  let isOverdue = 0;
  let deadlineProximity = 0;

  if (task.hasDeadline && task.deadline) {
    daysUntilDeadline = (task.deadline.getTime() - now) / DAY_MS;
    if (daysUntilDeadline <= 0) {
      isOverdue = 1;
      deadlineProximity = 1.0;
    } else if (daysUntilDeadline <= 7) {
      deadlineProximity = 1 - daysUntilDeadline / 7;
    }
  }

  const weekday = new Date(now).getDay(); // JS: 0=Sun
  const pythonWeekday = weekday === 0 ? 6 : weekday - 1; // Python: 0=Mon

  return {
    id: task.id,
    days_since_creation: daysSinceCreation,
    days_since_last_interaction: daysSinceLastInteraction,
    days_until_deadline: daysUntilDeadline,
    is_overdue: isOverdue,
    deadline_proximity: deadlineProximity,
    skip_count: task.skipCount,
    estimated_effort: task.estimatedEffort,
    has_deadline: task.hasDeadline ? 1 : 0,
    weekday: pythonWeekday,
    is_weekend: pythonWeekday >= 5 ? 1 : 0,
    urgency: URGENCY_MAP[task.urgency] ?? 'Medium',
    task_type: TASK_TYPE_MAP[task.taskType] ?? 'Do',
  };
}

// ── Router ───────────────────────────────────────────────────────────────────

export const tasksRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(tasks).orderBy(tasks.createdAt);
  }),

  create: publicProcedure
    .input(createTaskSchema)
    .mutation(async ({ input }) => {
      const [task] = await db
        .insert(tasks)
        .values({
          ...input,
          deadline: input.deadline ? new Date(input.deadline) : null,
          hasDeadline: input.hasDeadline ?? false,
        })
        .returning();
      return task;
    }),

  complete: publicProcedure
    .input(taskIdSchema)
    .mutation(async ({ input }) => {
      const [task] = await db
        .update(tasks)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, input.id))
        .returning();
      return task;
    }),

  skip: publicProcedure
    .input(taskIdSchema)
    .mutation(async ({ input }) => {
      const existing = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
      if (!existing[0]) throw new Error('Task not found');
      const [task] = await db
        .update(tasks)
        .set({
          status: 'skipped',
          skipCount: existing[0].skipCount + 1,
          lastInteractedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.id))
        .returning();
      return task;
    }),

  reopen: publicProcedure
    .input(taskIdSchema)
    .mutation(async ({ input }) => {
      const [task] = await db
        .update(tasks)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(tasks.id, input.id))
        .returning();
      return task;
    }),

  recommend: publicProcedure.query(async () => {
    const pending = await db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, 'completed'), ne(tasks.status, 'skipped')));

    const now = Date.now();

    let res: Response;
    try {
      res = await fetch(`${ML_API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: pending.map((t) => toFeatures(t, now)),
          top_k: 5,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `ML service unreachable at ${ML_API}. Start it with: pnpm ml`,
        cause: err,
      });
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `ML service returned ${res.status}: ${body}`,
      });
    }

    const ranked: { id: number; score: number }[] = await res.json();
    const scoreById = new Map(ranked.map((r) => [r.id, r.score]));

    return ranked.map(({ id }) => {
      const task = pending.find((t) => t.id === id)!;
      return { ...task, score: scoreById.get(id) ?? 0 };
    });
  }),
});
