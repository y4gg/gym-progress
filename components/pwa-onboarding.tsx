"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  Hand,
  Plus,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { Launchpad } from "@/components/launchpad";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatWeight } from "@/lib/weight-units";

const steps = [
  {
    title: "Welcome to Gym Ladder",
    description:
      "Your workouts, your progress. One step stronger every session.",
  },
  {
    title: "Open your menu",
    description:
      "Swipe from right to left to open your launchpad. Your workouts and account are always within reach.",
  },
  {
    title: "Keep climbing, even offline",
    description:
      "Create a workout, add your exercises, and log your reps. Your changes are saved on this device, even without a connection.",
  },
  {
    title: "You’re all set",
    description:
      "Sign in to sync your progress across devices when you’re online. Ready for your next workout?",
  },
];

export function PwaOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const weightUnit = useStore((state) => state.weightUnit);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  return (
    <main className="flex min-h-svh w-full flex-col bg-background px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3 font-bold">
            <AppLogo className="size-9 shrink-0" />
            Gym Ladder
          </span>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={step + 1}
            className="flex gap-1.5"
          >
            {steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "size-2 rounded-full bg-muted",
                  index <= step && "bg-primary",
                )}
              />
            ))}
          </div>
        </div>

        <header className="space-y-4 pt-4 text-center">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            {steps[step].title}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {steps[step].description}
          </p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
          {step === 0 && (
            <div className="flex w-full flex-col gap-4 rounded-3xl border bg-card p-6">
              {[
                { icon: Plus, label: "Build your workout routine" },
                { icon: Dumbbell, label: "Track weights, sets, and reps" },
                { icon: TrendingUp, label: "See your progress over time" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4 text-sm font-medium"
                >
                  <Icon className="size-6 shrink-0" aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          )}
          {step === 1 && (
            <>
              <div
                aria-hidden="true"
                className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-3xl border bg-muted/30"
              >
                <div className="flex items-center gap-4 motion-safe:animate-[onboarding-swipe_1.8s_ease-in-out_infinite]">
                  <ArrowLeft className="size-10" />
                  <Hand className="size-14 -rotate-12" />
                </div>
                <span className="absolute inset-x-0 bottom-5 text-center text-sm text-muted-foreground">
                  Swipe left to try it
                </span>
              </div>
              <Launchpad
                pathname="/"
                session={null}
                isSessionPending={false}
                onTutorialComplete={() => setStep(2)}
              />
            </>
          )}
          {step === 2 && (
            <div className="w-full space-y-5 rounded-3xl border bg-card p-6">
              <div className="flex items-center gap-3 font-semibold">
                <WifiOff className="size-6" aria-hidden="true" />
                Works fully offline
              </div>
              <div className="rounded-2xl bg-muted/50 p-5">
                <p className="mb-3 font-medium">Bench press</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Set 1</span>
                  <span>{formatWeight(60, weightUnit)} {weightUnit} × 8 reps</span>
                  <Check
                    className="size-4 text-foreground"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div
              aria-hidden="true"
              className="flex size-36 items-center justify-center rounded-full bg-primary/10"
            >
              <Check className="size-20" />
            </div>
          )}
        </div>

        <footer className="mt-auto flex flex-col gap-3">
          {step !== 1 && (
            <Button
              size="lg"
              className="min-h-12 w-full"
              onClick={() => (step === 3 ? onComplete() : setStep(step + 1))}
            >
              {step === 3 ? "Get started" : "Continue"}
              {step !== 3 && <ChevronRight aria-hidden="true" />}
            </Button>
          )}
          <div className="flex justify-between gap-4">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button variant="ghost" onClick={onComplete}>
              Skip onboarding
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
