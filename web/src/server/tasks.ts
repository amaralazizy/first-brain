import { createServerFn } from '@tanstack/react-start'
import { eq, and, ne, or, desc } from 'drizzle-orm'
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

    interface ScoredTask {
      id: number
      score: number
      explanation: Array<{ feature: string; shap_value: number }>
    }

    const ranked: ScoredTask[] = await res.json()
    const byId = new Map(ranked.map((r) => [r.id, r]))

    return ranked.map(({ id }) => {
      const task = pending.find((t) => t.id === id)!
      const ml = byId.get(id)!
      return { ...task, score: ml.score, explanation: ml.explanation }
    })
  })

export const sendFeedback = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => {
    const data = raw as { taskId: number; action: 'complete' | 'skip'; score?: number }
    return data
  })
  .handler(async ({ data }) => {
    try {
      await fetch(`${ML_API}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: data.taskId,
          action: data.action,
          score: data.score ?? null,
        }),
        signal: AbortSignal.timeout(2000),
      })
    } catch {
      // Feedback delivery is best-effort — don't block the UI mutation
    }
  })

// ── ML API proxies ────────────────────────────────────────────────────────────

export const getModelHealth = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const res = await fetch(`${ML_API}/health`, { signal: AbortSignal.timeout(3000) })
      const json = await res.json()
      return { online: true as const, ...json }
    } catch {
      return { online: false as const }
    }
  })

export const getModelMetrics = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const res = await fetch(`${ML_API}/metrics`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return res.json() as Promise<any>
    } catch {
      return null
    }
  })

export const triggerRetrain = createServerFn({ method: 'POST' })
  .handler(async () => {
    const res = await fetch(`${ML_API}/train`, {
      method: 'POST',
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) throw new Error(`Training failed: ${res.status}`)
    return res.json()
  })

// ── DB analytics ─────────────────────────────────────────────────────────────

export const getAnalytics = createServerFn({ method: 'GET' })
  .handler(async () => {
    const all = await db.select().from(tasks)
    const completed = all.filter((t) => t.status === 'completed')
    const skipped = all.filter((t) => t.status === 'skipped')
    const pending = all.filter((t) => t.status === 'pending')

    const total = all.length
    const completionRate = total > 0 ? completed.length / total : 0
    const skipRate = total > 0 ? skipped.length / total : 0
    const avgEffort = total > 0 ? all.reduce((s, t) => s + t.estimatedEffort, 0) / total : 0

    const taskTypes = ['work', 'personal', 'learning', 'health', 'other'] as const
    const taskTypeBreakdown = taskTypes.map((type) => ({
      type,
      total: all.filter((t) => t.taskType === type).length,
      completed: completed.filter((t) => t.taskType === type).length,
      skipped: skipped.filter((t) => t.taskType === type).length,
    }))

    const urgencies = ['Low', 'Medium', 'High', 'Critical'] as const
    const urgencyBreakdown = urgencies.map((u) => ({
      urgency: u,
      count: all.filter((t) => t.urgency === u).length,
    }))

    const now = Date.now()
    const cutoff = now - 30 * 86_400_000
    const timeline: Record<string, number> = {}
    for (const t of completed) {
      if (t.completedAt && t.completedAt.getTime() >= cutoff) {
        const day = t.completedAt.toISOString().slice(0, 10)
        timeline[day] = (timeline[day] ?? 0) + 1
      }
    }

    const mostSkipped = pending
      .filter((t) => t.skipCount > 0)
      .sort((a, b) => b.skipCount - a.skipCount)
      .slice(0, 5)

    return {
      total,
      completedCount: completed.length,
      skippedCount: skipped.length,
      pendingCount: pending.length,
      completionRate,
      skipRate,
      avgEffort,
      taskTypeBreakdown,
      urgencyBreakdown,
      timeline,
      mostSkipped,
    }
  })

export const listHistory = createServerFn({ method: 'GET' })
  .handler(() =>
    db
      .select()
      .from(tasks)
      .where(or(eq(tasks.status, 'completed'), eq(tasks.status, 'skipped')))
      .orderBy(desc(tasks.updatedAt)),
  )
