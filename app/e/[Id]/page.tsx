"use client";

import { use } from "react";
import ExercisePage from "@/components/screens/exercise";

export default function Page({ params }: { params: Promise<{ Id: string }> }) {
  const { Id: exerciseId } = use(params);
  return <ExercisePage exerciseId={exerciseId} />;
}
