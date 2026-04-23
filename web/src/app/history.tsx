import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listHistory } from '../server/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

type Status = 'all' | 'completed' | 'skipped'

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  skipped:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
const URGENCY_BADGE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High:     'bg-orange-100 text-orange-800',
  Medium:   'bg-yellow-100 text-yellow-800',
  Low:      'bg-green-100 text-green-800',
}

function formatDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function timeAgo(d: Date | null) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function HistoryPage() {
  const [filter, setFilter] = useState<Status>('all')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['tasks', 'history'],
    queryFn: () => listHistory(),
  })

  const filtered = filter === 'all' ? history : history.filter((t) => t.status === filter)

  const completedCount = history.filter((t) => t.status === 'completed').length
  const skippedCount   = history.filter((t) => t.status === 'skipped').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wrap balance">History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Completed and skipped tasks — these are the model's training labels
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-emerald-600 font-medium">{completedCount} done</span>
          <span>·</span>
          <span>{skippedCount} skipped</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b pb-0">
        {(['all', 'completed', 'skipped'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm capitalize border-b-2 transition-colors ${
              filter === s
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? `All (${history.length})` : s === 'completed' ? `Completed (${completedCount})` : `Skipped (${skippedCount})`}
          </button>
        ))}
      </div>

      {/* Loading skeleton - matches actual task card structure */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-3 bg-muted rounded w-1/3 mt-2 animate-pulse" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-8 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="h-3 w-10 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-14 bg-muted rounded animate-pulse mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center font-normal text-muted-foreground">
              {filter === 'all' ? 'No completed or skipped tasks yet' : `No ${filter} tasks`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Complete or skip tasks from Today&apos;s Picks to build your history.
            </p>
            <Button asChild><Link to="/">Go to Today&apos;s Picks</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((task) => {
            const doneAt = task.status === 'completed' ? task.completedAt : task.updatedAt
            return (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <Badge className={`${STATUS_BADGE[task.status]} text-[11px] font-medium shrink-0`}>
                        {task.status === 'completed' ? '✓ Done' : '— Skipped'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge className={`${URGENCY_BADGE[task.urgency]} text-[11px]`}>{task.urgency}</Badge>
                      <Badge variant="outline" className="text-[11px]">{task.taskType}</Badge>
                      <Badge variant="outline" className="text-[11px]">{task.estimatedEffort}h</Badge>
                      {task.skipCount > 0 && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Skipped {task.skipCount}×
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{timeAgo(doneAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(doneAt)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
