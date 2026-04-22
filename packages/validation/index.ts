import { z } from "zod";

export const urgencyValues = ['Low', 'Medium', 'High', 'Critical'] as const;
export const taskTypeValues = ['work', 'personal', 'learning', 'health', 'other'] as const;
export const taskStatusValues = ['pending', 'completed', 'skipped'] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  urgency: z.enum(urgencyValues).default('Medium'),
  taskType: z.enum(taskTypeValues).default('other'),
  estimatedEffort: z.number().int().min(1).max(40).default(1),
  deadline: z.iso.datetime().optional(),
  hasDeadline: z.boolean().default(false),
});

export const taskIdSchema = z.object({ id: z.number() });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// kept for existing routers
export const postIdInputSchema = z.object({ id: z.number() });
