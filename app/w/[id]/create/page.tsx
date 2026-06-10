"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Info } from "lucide-react";
import { use } from "react";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function CreateExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const workout = useStore((state) => state.getWorkoutById(id));

  if (!workout) {
    return <div>Workout not found</div>;
  }

  return (
    <div className="grid sm:p-24 mx-auto max-w-7xl gap-2 p-6">
      <h1 className="text-4xl font-bold">Create Exercise</h1>
      <div>
        <Label>Weight</Label>
        <div className="relative mt-1">
          <Input type="number" className="pr-8" />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            kg
          </span>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea className="mt-1" />
      </div>
      <div>
        <Label>Sets</Label>
        <div className="flex items-center gap-1 mt-1">
          <Button size="icon" variant="outline">
            <Plus />
          </Button>
          <div className="relative">
            <Input type="number" className="pr-8" />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              sets
            </span>
          </div>
          <Button size="icon" variant="outline">
            <Minus />
          </Button>
        </div>
      </div>
      <div className="flex gap-1">
        <Button className="flex-1" variant="outline">
          Increase weight suggestions
        </Button>
        <Button variant="outline" size="icon">
          <Info />
        </Button>
      </div>
      <div>
        <Label className="mb-1">Logging</Label>
        <ToggleGroup type="single" variant={"outline"} defaultValue="false">
          <ToggleGroupItem value="true">Enabled</ToggleGroupItem>
          <ToggleGroupItem value="false">Disabled</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button>Create Exercise</Button>
    </div>
  );
}
