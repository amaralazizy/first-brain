import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const urgencyEnum = pgEnum('urgency', ['Low', 'Medium', 'High', 'Critical']);
export const taskTypeEnum = pgEnum('task_type', ['work', 'personal', 'learning', 'health', 'other']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed', 'skipped']);

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),

  // ML feature fields (mirrors recommendation-engine feature set)
  urgency: urgencyEnum('urgency').notNull().default('Medium'),
  taskType: taskTypeEnum('task_type').notNull().default('other'),
  estimatedEffort: integer('estimated_effort').notNull().default(1), // hours
  deadline: timestamp('deadline'),
  hasDeadline: boolean('has_deadline').notNull().default(false),

  // Behavioural tracking
  skipCount: integer('skip_count').notNull().default(0),
  status: taskStatusEnum('status').notNull().default('pending'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  lastInteractedAt: timestamp('last_interacted_at'),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
