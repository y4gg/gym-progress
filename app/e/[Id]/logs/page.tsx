"use client";

import { use } from "react";
import ExerciseLogsPage from "@/components/screens/exercise-logs";

export default function Page({ params }: { params: Promise<{ Id: string }> }) {
  const { Id: exerciseId } = use(params);
  return <ExerciseLogsPage exerciseId={exerciseId} />;
}
