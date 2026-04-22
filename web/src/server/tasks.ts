import { createServerFn } from '@tanstack/react-start'
import { eq, and, ne } from 'drizzle-orm'
import { db, tasks } from '@first-brain/db'
import { createTaskSchema, taskIdSchema } from '@first-brain/validation'

const ML_API = process.env.ML_API_URL ?? 'http://localhost:8000'
const DAY_MS = 86_400_000

const URGENCY_MAP: Record<string, string> = {
  Low: 'Low', Medium: 'Medium', High: 'High',
  Critical: 'High',
}
const TASK_TYPE_MAP: Record<string, string> = {
  work: 'Do', personal: 'Life', learning: 'Learn',
  health: 'Life', other: 'Do',
}

function toFeatures(task: typeof tasks.$inferSelect, now: number) {
  const daysSinceCreation = (now - task.createdAt.getTime()) / DAY_MS
  const lastSeen = task.lastInteractedAt ?? task.createdAt
  const daysSinceLastInteraction = (now - lastSeen.getTime()) / DAY_MS

  let daysUntilDeadline = 0
  let isOverdue = 0
  let deadlineProximity = 0

  if (task.hasDeadline && task.deadline) {
    daysUntilDeadline = (task.deadline.getTime() - now) / DAY_MS
    if (daysUntilDeadline <= 0) {
      isOverdue = 1
      deadlineProximity = 1.0
    } else if (daysUntilDeadline <= 7) {
      deadlineProximity = 1 - daysUntilDeadline / 7
    }
  }

  const weekday = new Date(now).getDay()
  const pythonWeekday = weekday === 0 ? 6 : weekday - 1

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
  }
}

export const listTasks = createServerFn({ method: 'GET' })
  .handler(() => db.select().from(tasks).orderBy(tasks.createdAt))

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(createTaskSchema)
  .handler(async ({ data }) => {
    const [task] = await db
      .insert(tasks)
      .values({
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : null,
        hasDeadline: data.hasDeadline ?? false,
      })
      .returning()
    return task
  })

export const completeTask = createServerFn({ method: 'POST' })
  .inputValidator(taskIdSchema)
  .handler(async ({ data }) => {
    const [task] = await db
      .update(tasks)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, data.id))
      .returning()
    return task
  })

export const skipTask = createServerFn({ method: 'POST' })
  .inputValidator(taskIdSchema)
  .handler(async ({ data }) => {
    const existing = await db.select().from(tasks).where(eq(tasks.id, data.id)).limit(1)
    if (!existing[0]) throw new Error('Task not found')
    const [task] = await db
      .update(tasks)
      .set({
        status: 'skipped',
        skipCount: existing[0].skipCount + 1,
        lastInteractedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, data.id))
      .returning()
    return task
  })

export const reopenTask = createServerFn({ method: 'POST' })
  .inputValidator(taskIdSchema)
  .handler(async ({ data }) => {
    const [task] = await db
      .update(tasks)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(tasks.id, data.id))
      .returning()
    return task
  })

export const recommendTasks = createServerFn({ method: 'GET' })
  .handler(async () => {
    const pending = await db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, 'completed'), ne(tasks.status, 'skipped')))

    const now = Date.now()

    let res: Response
    try {
      res = await fetch(`${ML_API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: pending.map((t) => toFeatures(t, now)),
          top_k: 5,
        }),
        signal: AbortSignal.timeout(5000),
      })
    } catch (err) {
      throw new Error(
        `ML service unreachable at ${ML_API}. Start it with: pnpm ml`,
      )
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`ML service returned ${res.status}: ${body}`)
    }

    const ranked: { id: number; score: number }[] = await res.json()
    const scoreById = new Map(ranked.map((r) => [r.id, r.score]))

    return ranked.map(({ id }) => {
      const task = pending.find((t) => t.id === id)!
      return { ...task, score: scoreById.get(id) ?? 0 }
    })
  })
