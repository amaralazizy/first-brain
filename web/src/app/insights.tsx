import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getModelHealth, getModelMetrics, triggerRetrain } from '../server/tasks'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/insights')({
  component: InsightsPage,
})

const FEATURE_LABEL: Record<string, string> = {
  deadline_proximity: 'Deadline proximity',
  is_overdue: 'Is overdue',
  days_since_last_interaction: 'Days since seen',
  skip_count: 'Skip count',
  estimated_effort: 'Estimated effort',
  days_until_deadline: 'Days to deadline',
  days_since_creation: 'Task age (days)',
  has_deadline: 'Has deadline',
  weekday: 'Day of week',
  is_weekend: 'Is weekend',
}
function fLabel(name: string) {
  if (name.startsWith('task_type_')) return `Type: ${name.replace('task_type_', '')}`
  if (name.startsWith('urgency_')) return `Urgency: ${name.replace('urgency_', '')}`
  return FEATURE_LABEL[name] ?? name.replace(/_/g, ' ')
}

const METRIC_DEFS = [
  { key: 'roc_auc', label: 'ROC-AUC', desc: 'Area under ROC curve', higher: true },
  { key: 'precision_at_5', label: 'Precision@5', desc: 'Fraction correct in top-5', higher: true },
  { key: 'recall_at_5', label: 'Recall@5', desc: 'Coverage in top-5', higher: true },
  { key: 'f1', label: 'F1 Score', desc: 'Harmonic mean of P & R', higher: true },
  { key: 'avg_precision', label: 'Avg Precision', desc: 'Area under PR curve', higher: true },
  { key: 'calibration_error', label: 'Calibration Error', desc: 'Mean abs. calibration error', higher: false },
]

function MetricCard({ label, desc, value, higher, isLoading }: { label: string; desc: string; value?: number | null; higher: boolean; isLoading?: boolean }) {
  const hasValue = value != null
  const good = hasValue && (higher ? value >= 0.7 : value <= 0.15)
  const ok   = hasValue && (higher ? value >= 0.5 : value <= 0.25)
  const color = !hasValue ? 'text-muted-foreground' : good ? 'text-emerald-600' : ok ? 'text-amber-600' : 'text-destructive'
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardDescription className="text-xs">{desc}</CardDescription>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="h-9 w-16 bg-muted rounded animate-pulse" />
        ) : hasValue ? (
          <span className={`text-3xl font-bold tabular-nums ${color}`}>
            {value!.toFixed(3)}
          </span>
        ) : (
          <span className={`text-3xl font-bold tabular-nums ${color}`}>—</span>
        )}
      </CardContent>
    </Card>
  )
}

function ImportanceBar({ feature, importance, max }: { feature: string; importance: number; max: number }) {
  const pct = max > 0 ? (importance / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-muted-foreground w-44 truncate text-right shrink-0 group-hover:text-foreground transition-colors">
        {fLabel(feature)}
      </span>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full transition-all group-hover:bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right shrink-0">
        {(importance * 100).toFixed(1)}%
      </span>
    </div>
  )
}

function InsightsPage() {
  const queryClient = useQueryClient()

  const { data: health } = useQuery({
    queryKey: ['ml', 'health'],
    queryFn: () => getModelHealth(),
    refetchInterval: 30_000,
  })

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['ml', 'metrics'],
    queryFn: () => getModelMetrics(),
    enabled: health?.online === true,
  })

  const retrain = useMutation({
    mutationFn: () => triggerRetrain(),
    onSuccess: () => {
      toast.success('Retraining started')
      queryClient.invalidateQueries({ queryKey: ['ml'] })
    },
    onError: () => {
      toast.error('Failed to start retraining')
    },
  })

  const offline = !health || health.online === false
  const importances = (metrics?.feature_importances as Array<{ feature: string; importance: number }> | undefined) ?? []
  const maxImp = importances.length > 0 ? importances[0].importance : 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wrap balance">ML Insights</h1>
          <p className="text-muted-foreground text-sm mt-1">
            XGBoost model · live metrics from the recommendation engine
          </p>
        </div>
        <Button
          onClick={() => retrain.mutate()}
          disabled={offline || retrain.isPending}
          variant="outline"
          size="sm"
        >
          {retrain.isPending ? 'Retraining…' : '↺ Retrain'}
        </Button>
      </div>

      {/* Offline banner */}
      {offline && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <div>
              <p className="font-medium text-sm text-amber-800 dark:text-amber-300">ML service offline</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Metrics are unavailable. Start the service in a terminal:{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">pnpm ml</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model meta pills */}
      {metrics && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Trained', value: metrics.trained_at ? new Date(metrics.trained_at as string).toLocaleString() : '—' },
            { label: 'Train rows', value: String(metrics.n_train ?? '—') },
            { label: 'Test rows',  value: String(metrics.n_test  ?? '—') },
            { label: 'Features',   value: String(metrics.n_features ?? '—') },
          ].map(({ label, value }) => (
            <Badge key={label} variant="outline" className="gap-1 font-normal text-xs py-1">
              <span className="text-muted-foreground">{label}:</span> {value}
            </Badge>
          ))}
        </div>
      )}

      {/* Metric cards - with inline skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {METRIC_DEFS.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            desc={m.desc}
            higher={m.higher}
            value={metrics ? ((metrics[m.key] as number) ?? null) : undefined}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Feature importance */}
      {importances.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature Importance</CardTitle>
            <CardDescription className="text-xs">
              XGBoost gain-based importance — higher means the feature drives more predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {importances.map(({ feature, importance }) => (
              <ImportanceBar key={feature} feature={feature} importance={importance} max={maxImp} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Retrain success message */}
      {retrain.isSuccess && (
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="py-3 text-sm text-emerald-700 dark:text-emerald-300">
            ✓ Retrain complete — metrics updated above.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
