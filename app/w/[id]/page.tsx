"use client";
import { use, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { Edit, GripVertical } from "lucide-react";
import { notFound } from "next/navigation";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";
import { toast } from "sonner";

type SortableExerciseRowProps = {
  exercise: Exercise;
};

const EMPTY_EXERCISES: Exercise[] = [];

function SortableExerciseRow({ exercise }: SortableExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  return (
    <div
      ref={setNodeRef}
      className="flex h-16 w-full items-center rounded-md border bg-background px-5 text-left text-2xl font-semibold shadow-xs"
      style={{
        opacity: isDragging ? 0.8 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
      <button
        aria-label={`Drag ${exercise.name}`}
        className="ml-3 flex size-10 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-6" />
      </button>
    </div>
  );
}

export default function WorkoutOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hydrated = useStoreHydrated();
  const workout = useStore((state) => state.getWorkoutById(id));
  const reorderWorkoutExercises = useStore(
    (state) => state.reorderWorkoutExercises,
  );
  const [sorting, setSorting] = useState(false);
  const [draftExerciseIds, setDraftExerciseIds] = useState<string[]>([]);
  const exercises = workout?.exercises ?? EMPTY_EXERCISES;
  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const draftExercises = draftExerciseIds
    .map((exerciseId) => exercisesById.get(exerciseId))
    .filter((exercise): exercise is Exercise => Boolean(exercise));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!hydrated) {
    return null;
  }

  if (!workout) {
    notFound();
  }

  const handleSortStart = () => {
    setDraftExerciseIds(exercises.map((exercise) => exercise.id));
    setSorting(true);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setDraftExerciseIds((exerciseIds) => {
      const oldIndex = exerciseIds.indexOf(String(active.id));
      const newIndex = exerciseIds.indexOf(String(over.id));

      if (oldIndex === -1 || newIndex === -1) return exerciseIds;
      return arrayMove(exerciseIds, oldIndex, newIndex);
    });
  };

  const handleSortCancel = () => {
    setDraftExerciseIds([]);
    setSorting(false);
  };

  const handleSortDone = () => {
    reorderWorkoutExercises(workout.id, draftExerciseIds);
    setSorting(false);
    toast.success("Exercise order saved.");
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-6 py-9 pb-28">
      <h1 className="mb-2 truncate text-center text-3xl font-bold">
        {workout.name}
      </h1>
      {sorting ? (
        <>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={draftExerciseIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {draftExercises.map((exercise) => (
                  <SortableExerciseRow exercise={exercise} key={exercise.id} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              className="h-16 text-xl font-semibold"
              onClick={handleSortCancel}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-16 text-xl font-semibold"
              onClick={handleSortDone}
              type="button"
            >
              Done
            </Button>
          </div>
        </>
      ) : (
        <>
          {exercises.map((exercise: Exercise) => (
            <div className="flex w-full gap-2" key={exercise.id}>
              <Button
                asChild
                variant="outline"
                className="h-16 min-w-0 flex-1 justify-start px-5 text-left text-2xl font-semibold"
              >
                <Link href={`/e/${exercise.id}`}>
                  <span className="min-w-0 truncate">{exercise.name}</span>
                </Link>
              </Button>
              <EditExerciseDialog
                trigger={
                  <Button
                    aria-label={`Edit ${exercise.name}`}
                    className="h-16 w-16"
                    variant="secondary"
                  >
                    <Edit />
                  </Button>
                }
                exercise={exercise}
              />
            </div>
          ))}
          <Button
            className="h-16 text-xl font-semibold"
            disabled={exercises.length < 2}
            onClick={handleSortStart}
            type="button"
            variant="secondary"
          >
            Sort exercises
          </Button>
        </>
      )}
    </main>
  );
}
