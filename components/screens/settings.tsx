"use client";

import {
  Check,
  ChevronRight,
  Cloud,
  Dumbbell,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { z } from "zod";

import { AppLink } from "@/components/app-navigation";
import { usePwaOnboarding } from "@/components/pwa-context";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { SettingsLayout } from "@/components/settings-layout";
import { SyncStatus } from "@/components/sync-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { exerciseFieldsSchema, weightStepInputSchema } from "@/lib/workout-validation";
import { formatWeight, toKilograms, weightInputValue, type WeightUnit } from "@/lib/weight-units";

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function useHasAccount() {
  const session = authClient.useSession();
  const syncUserId = useStore((state) => state.syncUserId);
  return Boolean(session.data?.user.id ?? syncUserId);
}

export default function Settings() {
  const hasAccount = useHasAccount();
  const { canReplay, replay } = usePwaOnboarding();
  const { theme } = useTheme();
  const { sets, step } = useStore((state) => state.trainingDefaults);
  const weightUnit = useStore((state) => state.weightUnit);
  const links = [
    {
      href: "/settings/appearance",
      title: "Appearance",
      icon: Palette,
      detailId: "appearance-summary",
      detail: themes.find(({ value }) => value === theme)?.label,
    },
    {
      href: "/settings/sync",
      title: "Data & sync",
      icon: Cloud,
      detailId: "sync-summary",
      detail: hasAccount ? <SyncStatus /> : "Saved on this device",
    },
  ];
  if (hasAccount) {
    links.push({
      href: "/account",
      title: "Account",
      icon: UserRound,
      detailId: "account-summary",
      detail: "Email, password and passkeys",
    });
  }

  return (
    <SettingsLayout title="Settings" back={false}>
      <nav aria-label="Settings" className="grid gap-2">
        <AppLink
          href="/settings/training"
          aria-labelledby="training-link-title"
          aria-describedby="training-summary"
          className="flex min-h-24 items-center gap-3 rounded-2xl bg-[#dce5d4] px-4 py-4 text-[#171917] hover:bg-[#dce5d4]/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:px-5 dark:bg-[#252b23] dark:text-[#f5f5f0] dark:hover:bg-[#252b23]/75"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#171917]/10 dark:bg-[#f5f5f0]/10">
            <Dumbbell aria-hidden="true" className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span id="training-link-title" className="text-xl leading-tight font-semibold tracking-tight">
              Training
            </span>
            <span
              id="training-summary"
              className="flex flex-wrap gap-x-3 text-sm text-[#455241] tabular-nums dark:text-[#a8b49e]"
            >
              <span>
                <strong className="font-semibold">{sets.toLocaleString()}</strong> {sets === 1 ? "set" : "sets"}
              </span>
              <span>
                <strong className="font-semibold">+{formatWeight(step, weightUnit)}</strong> {weightUnit}
              </span>
            </span>
          </div>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[#455241] dark:text-[#a8b49e]" />
        </AppLink>
        <div className="divide-y divide-border">
          {links.map(({ href, title, icon: Icon, detail, detailId }) => (
            <AppLink
              key={href}
              href={href}
              aria-label={title}
              aria-describedby={detail ? detailId : undefined}
              className="flex min-h-18 items-center gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground sm:px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center text-muted-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="text-base font-semibold">{title}</span>
                {detail && (
                  <span id={detailId} className="text-sm text-muted-foreground">{detail}</span>
                )}
              </div>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </AppLink>
          ))}
        </div>
      </nav>

      <section
        aria-labelledby="other-settings"
        className="space-y-3 border-t border-border pt-5 not-has-[button]:hidden lg:hidden"
      >
        <h2 id="other-settings" className="text-base font-semibold">Other</h2>
        <PwaInstallButton />
        {canReplay && (
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full"
            onClick={replay}
          >
            <RotateCcw aria-hidden="true" />
            Replay onboarding
          </Button>
        )}
      </section>
    </SettingsLayout>
  );
}

const trainingNumbersSchema = exerciseFieldsSchema.pick({ sets: true, step: true });
const trainingInputClassName =
  "h-14 px-4 text-2xl font-semibold tracking-tight tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const weightUnits = [
  { value: "kg", label: "Kilograms" },
  { value: "lb", label: "Pounds" },
] as const;

export function TrainingSettings() {
  const defaults = useStore((state) => state.trainingDefaults);
  const setDefaults = useStore((state) => state.setTrainingDefaults);
  const weightUnit = useStore((state) => state.weightUnit);
  const setWeightUnit = useStore((state) => state.setWeightUnit);
  const [sets, setSets] = useState(String(defaults.sets));
  const [stepDraft, setStepDraft] = useState<{ value: string; unit: WeightUnit } | null>(null);
  const [errors, setErrors] = useState<{ sets?: string[]; step?: string[] }>({});
  const defaultStep = String(weightInputValue(defaults.step, weightUnit));
  const changed = sets !== String(defaults.sets) || stepDraft !== null;
  let step = defaultStep;
  if (stepDraft) {
    step = stepDraft.value;
    if (stepDraft.unit !== weightUnit && step !== "") {
      step = String(weightInputValue(toKilograms(Number(step), stepDraft.unit), weightUnit));
    }
  }

  function saveDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schema = stepDraft
      ? trainingNumbersSchema.extend({ step: weightStepInputSchema(stepDraft.unit) })
      : trainingNumbersSchema;
    const result = schema.safeParse({
      sets: Number(sets),
      step: stepDraft ? Number(stepDraft.value) : defaults.step,
    });
    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors);
      return;
    }

    setDefaults(result.data);
    setSets(String(result.data.sets));
    setStepDraft(null);
    setErrors({});
    toast.success("Training defaults saved.");
  }

  return (
    <SettingsLayout title="Training">
      <fieldset className="border-b border-border pb-5">
        <legend className="mb-3 text-sm font-medium">Weight unit</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:max-w-sm">
          {weightUnits.map(({ value, label }) => (
            <label key={value} className="min-w-0">
              <input
                type="radio"
                name="weight-unit"
                value={value}
                checked={weightUnit === value}
                onChange={() => setWeightUnit(value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-transparent px-2 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground peer-checked:border-border peer-checked:bg-background peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-foreground">
                {label} ({value})
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
        Set the starting values for new exercises on this device. You can adjust them for each exercise.
      </p>
      <form
        noValidate
        onSubmit={saveDefaults}
        className="grid items-start gap-5 sm:grid-cols-2"
      >
        <div className="grid gap-2">
          <Label htmlFor="default-sets">Default sets</Label>
          <Input
            id="default-sets"
            className={trainingInputClassName}
            type="number"
            inputMode="numeric"
            min={1}
            value={sets}
            aria-invalid={Boolean(errors.sets)}
            aria-describedby={errors.sets ? "default-sets-error" : undefined}
            onChange={(event) => {
              setSets(event.target.value);
              setErrors((current) => ({ ...current, sets: undefined }));
            }}
          />
          {errors.sets && (
            <p id="default-sets-error" role="alert" className="text-sm text-destructive">
              {errors.sets[0]}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="default-weight-increment">
            Default weight increment<span className="sr-only"> ({weightUnit})</span>
          </Label>
          <div className="relative">
            <Input
              id="default-weight-increment"
              className={`${trainingInputClassName} pr-13`}
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              value={step}
              aria-invalid={Boolean(errors.step)}
              aria-describedby={errors.step ? "default-step-error" : undefined}
              onChange={(event) => {
                const value = event.target.value;
                setStepDraft(value === defaultStep ? null : { value, unit: weightUnit });
                setErrors((current) => ({ ...current, step: undefined }));
              }}
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
              {weightUnit}
            </span>
          </div>
          {errors.step && (
            <p id="default-step-error" role="alert" className="text-sm text-destructive">
              {errors.step[0]}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={!changed}
          className="min-h-11 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 sm:col-span-2 sm:w-fit"
        >
          Save defaults
        </Button>
      </form>
      <Label
        htmlFor="default-rep-tracking"
        className="flex min-h-14 cursor-pointer justify-between gap-3 border-t border-border py-3 text-base"
      >
        Default rep tracking
        <Switch
          id="default-rep-tracking"
          checked={defaults.logging}
          onCheckedChange={(logging) => setDefaults({ logging })}
        />
      </Label>
    </SettingsLayout>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsLayout title="Appearance">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-muted-foreground">Theme</legend>
        <div className="grid gap-1">
          {themes.map(({ value, label, icon: Icon }) => (
            <label key={value} className="relative block">
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="peer sr-only"
              />
              <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-4 py-2 pr-12 text-base font-medium hover:bg-muted/60 peer-checked:border-border peer-checked:bg-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                {label}
              </span>
              <Check aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 my-auto size-5 opacity-0 peer-checked:opacity-100" />
            </label>
          ))}
        </div>
      </fieldset>
    </SettingsLayout>
  );
}

export function SyncSettings() {
  const hasAccount = useHasAccount();
  const syncStatus = useStore((state) => state.syncStatus);
  const lastSyncedAt = useStore((state) => state.lastSyncedAt);
  const pendingCount = useStore((state) => state.pendingSyncOperations.length);
  const offline = syncStatus === "offline";
  const syncDetails = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "No sync yet";
  const rowClassName = "flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3";

  return (
    <SettingsLayout title="Data & sync">
      <dl className="divide-y divide-border border-y border-border text-sm">
        <div className={rowClassName}>
          <dt className="text-muted-foreground">Connection</dt>
          <dd>{offline ? "Offline" : "Online"}</dd>
        </div>
        <div className={rowClassName}>
          <dt className="text-muted-foreground">Sync status</dt>
          <dd className="text-right">{hasAccount ? <SyncStatus /> : "Saved on this device"}</dd>
        </div>
        {hasAccount && (
          <>
            <div className={rowClassName}>
              <dt className="text-muted-foreground">Last successful sync</dt>
              <dd className="tabular-nums">
                {lastSyncedAt ? <time dateTime={lastSyncedAt}>{syncDetails}</time> : syncDetails}
              </dd>
            </div>
            <div className={rowClassName}>
              <dt className="text-muted-foreground">Pending changes</dt>
              <dd className="tabular-nums">{pendingCount}</dd>
            </div>
          </>
        )}
      </dl>
      {hasAccount && offline && (
        <p className="text-sm text-muted-foreground">
          Changes are saved on this device and sync when you reconnect.
        </p>
      )}
      {(!hasAccount || syncStatus === "unauthorized") && (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Sign in to sync your workouts across devices.
          </p>
          <Button asChild variant="outline" className="min-h-11 sm:w-fit">
            <AppLink href="/login">Sign in</AppLink>
          </Button>
        </div>
      )}
    </SettingsLayout>
  );
}
