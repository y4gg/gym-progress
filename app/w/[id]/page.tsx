"use client";

import { use } from "react";
import WorkoutOverview from "@/components/screens/workout";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorkoutOverview id={id} />;
}
