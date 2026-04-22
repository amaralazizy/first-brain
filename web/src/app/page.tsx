'use client';

import { trpc } from '@/src/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const URGENCY_COLOR: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
};

// XGBoost predict_proba scores are already 0–1 probabilities
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

export default function HomePage() {
  const utils = trpc.useUtils();
  const { data: recommended = [], isLoading, error } = trpc.tasks.recommend.useQuery();

  const complete = trpc.tasks.complete.useMutation({
    onSuccess: () => { utils.tasks.recommend.invalidate(); utils.tasks.list.invalidate(); },
  });
  const skip = trpc.tasks.skip.useMutation({
    onSuccess: () => { utils.tasks.recommend.invalidate(); utils.tasks.list.invalidate(); },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s Picks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ranked by XGBoost · trained on 13k simulated observations
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/tasks">All Tasks</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
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
            <CardTitle className="text-center font-normal text-muted-foreground">
              No pending tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Add tasks to get recommendations.
            </p>
            <Button asChild>
              <Link href="/tasks">+ Add Task</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {recommended.map((task, idx) => (
          <Card key={task.id}>
            <CardContent className="py-5 flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1 min-w-0">
                <span className="text-2xl font-bold text-muted-foreground/40 tabular-nums leading-none pt-0.5 shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge className={URGENCY_COLOR[task.urgency]}>{task.urgency}</Badge>
                    <Badge variant="outline">{task.taskType}</Badge>
                    <Badge variant="outline">{task.estimatedEffort}h</Badge>
                    {task.hasDeadline && task.deadline && (
                      <Badge variant="outline">
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </Badge>
                    )}
                    {task.skipCount > 0 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Skipped {task.skipCount}&times;
                      </Badge>
                    )}
                  </div>
                  <ScoreBar score={task.score} />
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button size="sm" onClick={() => complete.mutate({ id: task.id })} disabled={complete.isPending}>
                  Done
                </Button>
                <Button size="sm" variant="outline" onClick={() => skip.mutate({ id: task.id })} disabled={skip.isPending}>
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
