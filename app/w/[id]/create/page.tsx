"use client";

import { use } from "react";
import CreateExercisePage from "@/components/screens/create-exercise";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CreateExercisePage id={id} />;
}
