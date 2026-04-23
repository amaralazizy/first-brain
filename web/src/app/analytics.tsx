import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '../server/tasks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

const TYPE_COLOR: Record<string, string> = {
  work:     'bg-blue-500',
  personal: 'bg-violet-500',
  learning: 'bg-amber-500',
  health:   'bg-emerald-500',
  other:    'bg-slate-400',
}
const URGENCY_COLOR: Record<string, string> = {
  Critical: 'bg-red-500',
  High:     'bg-orange-500',
  Medium:   'bg-yellow-500',
  Low:      'bg-green-500',
}

function StatCard({ label, value, sub, isLoading }: { label: string; value?: string | number | null; sub?: string; isLoading?: boolean }) {
  return (
    <Card>
      <CardContent className="px-4 py-5">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {isLoading ? (
          <div className="h-9 w-16 bg-muted rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold tabular-nums">{value ?? '—'}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function HBar({ label, value, max, color, sublabel }: {
  label: string; value: number; max: number; color: string; sublabel?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-muted-foreground w-20 truncate text-right shrink-0 capitalize group-hover:text-foreground transition-colors">
        {label}
      </span>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-6 text-right shrink-0">{value}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  )
}

function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => getAnalytics(),
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header - always visible */}
      <div>
        <h1 className="text-2xl font-bold text-wrap balance">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Productivity patterns from your task history</p>
      </div>

      {/* Summary cards - skeleton only for values */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Tasks" value={stats?.total} isLoading={isLoading} sub={`${stats ? ((stats.completionRate * 100).toFixed(0) + '% completion rate') : undefined}`} />
        <StatCard label="Completed" value={stats?.completedCount} isLoading={isLoading} />
        <StatCard label="Skipped" value={stats?.skippedCount} isLoading={isLoading} />
        <StatCard label="Pending" value={stats?.pendingCount} isLoading={isLoading} />
        <StatCard label="Avg Effort" value={stats ? `${stats.avgEffort.toFixed(1)}h` : undefined} isLoading={isLoading} sub="per task" />
        <StatCard label="Total Hours" value={stats ? `${(stats.avgEffort * stats.total).toFixed(0)}h` : undefined} isLoading={isLoading} sub="estimated backlog" />
      </div>

      {/* Charts - only show when data is available */}
      {stats && (() => {
        const { total, completedCount, skippedCount, pendingCount, completionRate, skipRate, avgEffort, taskTypeBreakdown, urgencyBreakdown, timeline, mostSkipped } = stats

        const today = new Date()
        const days30 = Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today)
          d.setDate(today.getDate() - (29 - i))
          return d.toISOString().slice(0, 10)
        })
        const timelineData = days30.map((day) => ({ day, count: (timeline as Record<string, number>)[day] ?? 0 }))
        const maxDay = Math.max(...timelineData.map((d) => d.count), 1)
        const maxTypeTotal = Math.max(...taskTypeBreakdown.map((t) => t.total), 1)
        const maxUrgency = Math.max(...urgencyBreakdown.map((u) => u.count), 1)

        return (
          <>

      {/* 30-day timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Completions — Last 30 Days</CardTitle>
          <CardDescription className="text-xs">Tasks marked done per calendar day</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.every((d) => d.count === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No completed tasks in the last 30 days.</p>
          ) : (
            <div className="flex items-end gap-px h-20">
              {timelineData.map(({ day, count }) => (
                <div key={day} className="flex-1 flex flex-col justify-end group relative" title={`${day}: ${count}`}>
                  <div
                    className="bg-primary/60 group-hover:bg-primary rounded-t-sm transition-all"
                    style={{ height: `${(count / maxDay) * 100}%`, minHeight: count > 0 ? '3px' : '0' }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    {count} on {day.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Task type breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Task Type</CardTitle>
            <CardDescription className="text-xs">Total (completed / skipped)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {taskTypeBreakdown.filter((t) => t.total > 0).map(({ type, total: t, completed: c, skipped: s }) => (
              <div key={type} className="space-y-0.5">
                <HBar label={type} value={t} max={maxTypeTotal} color={TYPE_COLOR[type] ?? 'bg-primary'} />
                <p className="text-[10px] text-muted-foreground text-right pr-9">{c} done · {s} skipped</p>
              </div>
            ))}
            {taskTypeBreakdown.every((t) => t.total === 0) && (
              <p className="text-sm text-muted-foreground py-2 text-center">No tasks yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Urgency distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Urgency</CardTitle>
            <CardDescription className="text-xs">Task count per urgency level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgencyBreakdown.map(({ urgency, count }) => (
              <HBar key={urgency} label={urgency} value={count} max={maxUrgency} color={URGENCY_COLOR[urgency] ?? 'bg-primary'} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Most-skipped tasks */}
      {mostSkipped.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most-Skipped Pending Tasks</CardTitle>
            <CardDescription className="text-xs">
              These are the primary negative training signals for the ML model
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(mostSkipped as Array<{ id: number; title: string; skipCount: number; urgency: string; taskType: string }>).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.taskType} · {t.urgency}</p>
                </div>
                <span className="text-sm font-bold text-destructive shrink-0">{t.skipCount}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats && total === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">No tasks yet — add some to see analytics.</p>
              <Button asChild><Link to="/tasks">+ Add Task</Link></Button>
            </CardContent>
          </Card>
        )}
      </>
        )
      })()}
    </div>
  )
}
