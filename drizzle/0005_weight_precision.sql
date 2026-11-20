ALTER TABLE "exercise" ALTER COLUMN "weight" SET DATA TYPE numeric(12, 6);--> statement-breakpoint
ALTER TABLE "exercise" ALTER COLUMN "step" SET DATA TYPE numeric(12, 6);--> statement-breakpoint
ALTER TABLE "exercise" ALTER COLUMN "step" SET DEFAULT 2.50;--> statement-breakpoint
ALTER TABLE "exercise_log" ALTER COLUMN "weight" SET DATA TYPE numeric(12, 6);