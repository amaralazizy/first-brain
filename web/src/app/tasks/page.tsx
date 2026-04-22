'use client';

import { useState } from 'react';
import { Skeleton } from 'boneyard-js/react';
import { trpc } from '@/src/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';

const URGENCY_COLOR: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-600',
};

export default function TasksPage() {
  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.recommend.invalidate(); setOpen(false); resetForm(); },
  });
  const complete = trpc.tasks.complete.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.recommend.invalidate(); } });
  const skip = trpc.tasks.skip.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.recommend.invalidate(); } });
  const reopen = trpc.tasks.reopen.useMutation({ onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.recommend.invalidate(); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    urgency: 'Medium' as const,
    taskType: 'other' as const,
    estimatedEffort: 1,
    hasDeadline: false,
    deadline: '',
  });

  const resetForm = () =>
    setForm({ title: '', description: '', urgency: 'Medium', taskType: 'other', estimatedEffort: 1, hasDeadline: false, deadline: '' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { deadline: deadlineStr, hasDeadline, ...rest } = form;
    createTask.mutate({
      ...rest,
      hasDeadline,
      deadline: hasDeadline && deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
    });
  };

  const pending = tasks.filter(t => t.status === 'pending');
  const done = tasks.filter(t => t.status !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">{pending.length} pending · {done.length} done</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Today&rsquo;s Picks</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Task</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>Fill in the details to add a task to your list.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="What needs to be done?"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Urgency</Label>
                    <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v as typeof f.urgency }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Low', 'Medium', 'High', 'Critical'].map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={form.taskType} onValueChange={v => setForm(f => ({ ...f, taskType: v as typeof f.taskType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['work', 'personal', 'learning', 'health', 'other'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="effort">Estimated Effort (hours)</Label>
                  <Input
                    id="effort"
                    type="number"
                    min={1} max={40}
                    value={form.estimatedEffort}
                    onChange={e => setForm(f => ({ ...f, estimatedEffort: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deadline">Deadline (optional)</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value, hasDeadline: !!e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createTask.isPending}>
                  {createTask.isPending ? 'Creating…' : 'Create Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Skeleton name="task-list" loading={isLoading}>
        <div className="space-y-2">
          {pending.map(task => (
            <Card key={task.id}>
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  {task.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge className={URGENCY_COLOR[task.urgency]}>{task.urgency}</Badge>
                    <Badge variant="outline">{task.taskType}</Badge>
                    <Badge variant="outline">{task.estimatedEffort}h</Badge>
                    {task.hasDeadline && task.deadline && (
                      <Badge variant="outline">Due {new Date(task.deadline).toLocaleDateString()}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => skip.mutate({ id: task.id })}>Skip</Button>
                  <Button size="sm" onClick={() => complete.mutate({ id: task.id })}>Done</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Skeleton>

      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed / Skipped</h2>
          {done.map(task => (
            <Card key={task.id} className="opacity-60">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate">{task.title}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge className={STATUS_COLOR[task.status]}>{task.status}</Badge>
                    <Badge className={URGENCY_COLOR[task.urgency]}>{task.urgency}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => reopen.mutate({ id: task.id })}>Reopen</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tasks.length === 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground font-normal">No tasks yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Add your first task to get started.</p>
            <Button onClick={() => setOpen(true)}>+ Add Task</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
