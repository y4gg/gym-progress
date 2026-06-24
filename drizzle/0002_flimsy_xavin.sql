ALTER TABLE "exercise" ADD COLUMN "position" integer;--> statement-breakpoint
WITH ordered_exercises AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "workout_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) - 1 AS "next_position"
  FROM "exercise"
)
UPDATE "exercise"
SET "position" = ordered_exercises."next_position"
FROM ordered_exercises
WHERE "exercise"."id" = ordered_exercises."id";--> statement-breakpoint
ALTER TABLE "exercise" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "exercise_workout_position_idx" ON "exercise" USING btree ("workout_id", "position");
