CREATE TYPE "public"."task_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('work', 'personal', 'learning', 'health', 'other');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"urgency" "urgency" DEFAULT 'Medium' NOT NULL,
	"task_type" "task_type" DEFAULT 'other' NOT NULL,
	"estimated_effort" integer DEFAULT 1 NOT NULL,
	"deadline" timestamp,
	"has_deadline" boolean DEFAULT false NOT NULL,
	"skip_count" integer DEFAULT 0 NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"last_interacted_at" timestamp
);
