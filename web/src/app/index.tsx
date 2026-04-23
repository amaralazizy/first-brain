import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recommendTasks, completeTask, skipTask, sendFeedback } from '../server/tasks'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const URGENCY_COLOR: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  High:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Medium:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Low:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

const FEATURE_REASON: Record<string, [string, string]> = {
  deadline_proximity:          ['deadline is close',       'deadline is far off'],
  is_overdue:                  ['it is overdue',           'not overdue'],
  days_since_last_interaction: ['been ignored a while',    'recently reviewed'],
  skip_count:                  ['skipped multiple times',  'rarely skipped'],
  estimated_effort:            ['high effort task',        'quick task'],
  days_until_deadline:         ['deadline is approaching', 'plenty of time left'],
  days_since_creation:         ['task is getting old',     'recently added'],
  has_deadline:                ['has a due date',          'no deadline set'],
  weekday:                     ['right day for this',      'off day for this'],
  is_weekend:                  ['weekend task',            'weekday task'],
}

function featureReason(name: string, positive: boolean): string {
  if (name.startsWith('urgency_'))   return positive ? `${name.replace('urgency_', '')} urgency` : 'low urgency'
  if (name.startsWith('task_type_')) return positive ? `${name.replace('task_type_', '')} tasks suit today` : 'type less suited'
  const pair = FEATURE_REASON[name]
  if (pair) return positive ? pair[0] : pair[1]
  return name.replace(/_/g, ' ')
}

interface Contribution { feature: string; shap_value: number }

/** Thin horizontal bar + labelled score — placed ABOVE the badge row */
function ScoreRow({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  // Use a single neutral accent color that works on dark backgrounds
  const barColor =
    pct >= 75 ? 'bg-primary'
    : pct >= 50 ? 'bg-amber-400'
    : 'bg-muted-foreground/50'
  const textColor =
    pct >= 75 ? 'text-foreground'
    : pct >= 50 ? 'text-amber-400'
    : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 mb-3">
      {/* bar */}
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {/* label */}
      <span className={`text-xs font-semibold tabular-nums shrink-0 ${textColor}`}>
        {pct}% priority
      </span>
    </div>
  )
}

function ShapChips({ explanation }: { explanation: Contribution[] }) {
  const top = explanation
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 3)
    .filter((c) => Math.abs(c.shap_value) > 0.001)

  if (top.length === 0) return null

  return (
    <div className="pt-3 border-t border-border/50 mt-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-2">
        Why this is ranked here
      </p>
      <div className="flex flex-wrap gap-1.5">
        {top.map((c) => {
          const positive = c.shap_value > 0
          const reason = featureReason(c.feature, positive)
          return (
            <span
              key={c.feature}
              title={`SHAP: ${c.shap_value > 0 ? '+' : ''}${c.shap_value.toFixed(3)}`}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border
                ${positive
                  ? 'border-border text-foreground bg-muted/40'
                  : 'border-border/50 text-muted-foreground bg-transparent'
                }`}
            >
              <span className={`text-[9px] ${positive ? 'text-primary' : 'text-muted-foreground'}`}>
                {positive ? '▲' : '▼'}
              </span>
              {reason}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const queryClient = useQueryClient()

  const { data: recommended = [], isLoading, error } = useQuery({
    queryKey: ['tasks', 'recommend'],
    queryFn: () => recommendTasks(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] })

  const complete = useMutation({
    mutationFn: async (task: { id: number; score?: number }) => {
      await sendFeedback({ data: { taskId: task.id, action: 'complete', score: task.score } })
      return completeTask({ data: { id: task.id } })
    },
    onSuccess: () => {
      toast.success('Task completed!')
      invalidate()
    },
    onError: () => {
      toast.error('Failed to complete task')
    },
  })

  const skip = useMutation({
    mutationFn: async (task: { id: number; score?: number }) => {
      await sendFeedback({ data: { taskId: task.id, action: 'skip', score: task.score } })
      return skipTask({ data: { id: task.id } })
    },
    onSuccess: () => {
      toast('Task skipped')
      invalidate()
    },
    onError: () => {
      toast.error('Failed to skip task')
    },
  })

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wrap balance">Today&apos;s Picks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ranked by XGBoost · explanations powered by SHAP
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/tasks">All Tasks</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-0 p-5 pb-4">
                  <span className="text-3xl font-bold text-muted-foreground/25 tabular-nums leading-none mr-3 mt-0.5 shrink-0 select-none">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted rounded-full w-2/3 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-5 bg-muted rounded w-3/4 animate-pulse mb-1" />
                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse mb-2.5" />
                    <div className="flex flex-wrap gap-1.5">
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 ml-4">
                    <div className="h-7 w-14 bg-muted rounded animate-pulse" />
                    <div className="h-7 w-14 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Recommendation engine offline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The ML service is not running. Start it in a separate terminal:
            </p>
            <pre className="text-xs bg-muted rounded px-3 py-2 font-mono">pnpm ml</pre>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && recommended.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center font-normal text-muted-foreground">No pending tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Add tasks to get recommendations.</p>
            <Button asChild><Link to="/tasks">+ Add Task</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {recommended.map((task, idx) => (
          <Card key={task.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* ── Top section: rank + content + actions ── */}
              <div className="flex items-start gap-0 p-5 pb-4">
                {/* Rank number */}
                <span className="text-3xl font-bold text-muted-foreground/25 tabular-nums leading-none mr-3 mt-0.5 shrink-0 select-none">
                  {idx + 1}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Priority bar — first thing, clearly separated from badges */}
                  <ScoreRow score={task.score} />

                  {/* Title + description */}
                  <p className="font-semibold leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                  )}

                  {/* Metadata badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Badge className={URGENCY_COLOR[task.urgency]}>{task.urgency}</Badge>
                    <Badge variant="outline">{task.taskType}</Badge>
                    <Badge variant="outline">{task.estimatedEffort}h</Badge>
                    {task.hasDeadline && task.deadline && (
                      <Badge variant="outline">Due {new Date(task.deadline).toLocaleDateString()}</Badge>
                    )}
                    {task.skipCount > 0 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Skipped {task.skipCount}&times;
                      </Badge>
                    )}
                  </div>

                  {/* SHAP — separated by border inside card */}
                  {'explanation' in task && Array.isArray(task.explanation) && (
                    <ShapChips explanation={task.explanation as Contribution[]} />
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0 ml-4">
                  <Button
                    size="sm"
                    onClick={() => complete.mutate({ id: task.id, score: task.score })}
                    disabled={complete.isPending}
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => skip.mutate({ id: task.id, score: task.score })}
                    disabled={skip.isPending}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
