"use client";

import { use } from "react";
import ExerciseHistoryPage from "@/components/screens/exercise-history";

export default function Page({ params }: { params: Promise<{ Id: string }> }) {
  const { Id: exerciseId } = use(params);
  return <ExerciseHistoryPage exerciseId={exerciseId} />;
}
