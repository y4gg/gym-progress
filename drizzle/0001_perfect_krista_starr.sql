CREATE TABLE "exercise_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"workout_id" text NOT NULL,
	"reps" integer NOT NULL,
	"weight" numeric(8, 2) NOT NULL,
	"performed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_log_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "exercise" ALTER COLUMN "step" SET DEFAULT 2.50;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_workout_id_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_log_userId_idx" ON "exercise_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exercise_log_exerciseId_idx" ON "exercise_log" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "exercise_log_performedAt_idx" ON "exercise_log" USING btree ("performed_at");