"use client";
import { useMemo, useState } from "react";
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
import { AppLink as Link } from "@/components/app-navigation";
import type { Exercise } from "@/lib/types";
import { ChevronRight, Dumbbell, Edit, GripVertical, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";
import { toast } from "sonner";
import { WorkoutIcon } from "@/components/workout-icon";
import { EmptyState } from "@/components/empty-state";

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
      className="gym-row relative flex h-18 w-full items-center gap-3 px-4 text-left text-xl font-semibold"
      style={{
        opacity: isDragging ? 0.8 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <span className="gym-icon-tile size-10">
        <WorkoutIcon name={exercise.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
      <button
        aria-label={`Drag ${exercise.name}`}
        className="gym-row-link gym-focus flex size-11 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-6" />
      </button>
    </div>
  );
}

export default function WorkoutOverview({ id }: { id: string }) {
  return <WorkoutScreen key={id} id={id} />;
}

function WorkoutScreen({ id }: { id: string }) {
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
  // Keep an active sort usable when another device adds or removes exercises.
  const draftIds = new Set(draftExerciseIds);
  const orderedExerciseIds = [
    ...draftExerciseIds.filter((exerciseId) => exercisesById.has(exerciseId)),
    ...exercises
      .filter((exercise) => !draftIds.has(exercise.id))
      .map((exercise) => exercise.id),
  ];
  const draftExercises = orderedExerciseIds
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

    setDraftExerciseIds(() => {
      const oldIndex = orderedExerciseIds.indexOf(String(active.id));
      const newIndex = orderedExerciseIds.indexOf(String(over.id));

      if (oldIndex === -1 || newIndex === -1) return orderedExerciseIds;
      return arrayMove(orderedExerciseIds, oldIndex, newIndex);
    });
  };

  const handleSortCancel = () => {
    setDraftExerciseIds([]);
    setSorting(false);
  };

  const handleSortDone = () => {
    reorderWorkoutExercises(workout.id, orderedExerciseIds);
    setSorting(false);
    toast.success("Exercise order saved.");
  };

  return (
    <main className="gym-page flex flex-col gap-4">
      <header className="gym-panel gym-hero flex flex-wrap items-center justify-between gap-4">
        <h1 className="gym-page-title flex min-w-0 items-center gap-3">
          <span className="gym-icon-tile size-11">
            <WorkoutIcon name={workout.icon} className="size-6" />
          </span>
          <span className="wrap-anywhere">{workout.name}</span>
        </h1>
        {!sorting && (
          <Button asChild className="gap-2 px-3 text-base">
            <Link href={`/w/${workout.id}/create`}>
              <Plus aria-hidden="true" />
              Create exercise
            </Link>
          </Button>
        )}
      </header>
      {sorting ? (
        <>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={orderedExerciseIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {draftExercises.map((exercise) => (
                  <SortableExerciseRow exercise={exercise} key={exercise.id} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              className="h-14 text-lg font-semibold"
              onClick={handleSortCancel}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-14 text-lg font-semibold"
              onClick={handleSortDone}
              type="button"
            >
              Done
            </Button>
          </div>
        </>
      ) : (
        <>
          {exercises.length === 0 && (
            <div className="gym-panel">
              <EmptyState icon={<Dumbbell className="size-8" />} title="No exercises yet" />
            </div>
          )}
          {exercises.map((exercise) => (
            <div className="gym-row flex min-h-18 items-center gap-1 p-2" key={exercise.id}>
              <Link
                className="gym-row-link gym-focus flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-xl font-semibold"
                href={`/e/${exercise.id}`}
              >
                <span className="gym-icon-tile size-10">
                  <WorkoutIcon name={exercise.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <EditExerciseDialog
                trigger={
                  <Button
                    aria-label={`Edit ${exercise.name}`}
                    className="size-11"
                    size="icon"
                    variant="outline"
                  >
                    <Edit aria-hidden="true" />
                  </Button>
                }
                exercise={exercise}
              />
            </div>
          ))}
          <Button
            className="h-12 self-start px-4 text-base font-semibold"
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
