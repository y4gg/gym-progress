"use client";

import {
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
import { exerciseFieldsSchema } from "@/lib/workout-validation";

const settingsLinks = [
  { href: "/settings/training", title: "Training", icon: Dumbbell },
  { href: "/settings/appearance", title: "Appearance", icon: Palette },
  { href: "/settings/sync", title: "Data & sync", icon: Cloud },
] as const;

const accountLink = { href: "/account", title: "Account", icon: UserRound };

function useHasAccount() {
  const session = authClient.useSession();
  const syncUserId = useStore((state) => state.syncUserId);
  return Boolean(session.data?.user.id ?? syncUserId);
}

export default function Settings() {
  const hasAccount = useHasAccount();
  const { canReplay, replay } = usePwaOnboarding();
  const links = hasAccount ? [...settingsLinks, accountLink] : settingsLinks;

  return (
    <SettingsLayout title="Settings" back={false}>
      <nav aria-label="Settings" className="divide-y divide-border/60">
        {links.map(({ href, title, icon: Icon }) => (
          <AppLink
            key={href}
            href={href}
            className="flex items-center gap-3 py-5 text-base font-semibold transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1">{title}</span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </AppLink>
        ))}
      </nav>

      <section
        aria-labelledby="other-settings"
        className="space-y-4 border-t border-border/60 pt-6 not-has-[button]:hidden lg:hidden"
      >
        <h2 id="other-settings" className="text-lg font-semibold">Other</h2>
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

export function TrainingSettings() {
  const defaults = useStore((state) => state.trainingDefaults);
  const setDefaults = useStore((state) => state.setTrainingDefaults);
  const [sets, setSets] = useState(String(defaults.sets));
  const [step, setStep] = useState(String(defaults.step));
  const [errors, setErrors] = useState<{ sets?: string[]; step?: string[] }>({});
  const changed = sets !== String(defaults.sets) || step !== String(defaults.step);

  function saveDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = trainingNumbersSchema.safeParse({
      sets: Number(sets),
      step: Number(step),
    });
    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors);
      return;
    }

    setDefaults(result.data);
    setSets(String(result.data.sets));
    setStep(String(result.data.step));
    setErrors({});
    toast.success("Training defaults saved.");
  }

  return (
    <SettingsLayout title="Training">
      <p className="text-sm text-muted-foreground">
        Used when you create an exercise on this device. You can change them for each exercise.
      </p>
      <Label
        htmlFor="default-rep-tracking"
        className="flex min-h-12 justify-between gap-3 text-base"
      >
        Default rep tracking
        <Switch
          id="default-rep-tracking"
          checked={defaults.logging}
          onCheckedChange={(logging) => setDefaults({ logging })}
        />
      </Label>
      <form
        noValidate
        onSubmit={saveDefaults}
        className="grid items-start gap-4 border-t border-border/60 pt-5 sm:grid-cols-2"
      >
        <div className="grid gap-2">
          <Label htmlFor="default-sets">Default sets</Label>
          <Input
            id="default-sets"
            className="h-11"
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
          <Label htmlFor="default-weight-increment">Default weight increment (kg)</Label>
          <Input
            id="default-weight-increment"
            className="h-11"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            value={step}
            aria-invalid={Boolean(errors.step)}
            aria-describedby={errors.step ? "default-step-error" : undefined}
            onChange={(event) => {
              setStep(event.target.value);
              setErrors((current) => ({ ...current, step: undefined }));
            }}
          />
          {errors.step && (
            <p id="default-step-error" role="alert" className="text-sm text-destructive">
              {errors.step[0]}
            </p>
          )}
        </div>
        <Button type="submit" disabled={!changed} className="min-h-11 sm:col-span-2 sm:w-fit">
          Save defaults
        </Button>
      </form>
    </SettingsLayout>
  );
}

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsLayout title="Appearance">
      <fieldset>
        <legend className="mb-3 text-base font-semibold">Theme</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {themes.map(({ value, label, icon: Icon }) => (
            <label key={value} className="min-w-0">
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent px-1.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground peer-checked:border-border peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {label}
              </span>
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

  return (
    <SettingsLayout title="Data & sync">
      <dl className="divide-y divide-border/60 text-sm">
        <div className="flex items-center justify-between gap-3 py-4">
          <dt className="font-medium">Connection</dt>
          <dd>{offline ? "Offline" : "Online"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-4">
          <dt className="font-medium">Sync status</dt>
          <dd className="text-right">{hasAccount ? <SyncStatus /> : "Saved on this device"}</dd>
        </div>
        {hasAccount && (
          <>
            <div className="flex items-center justify-between gap-3 py-4">
              <dt className="font-medium">Last successful sync</dt>
              <dd className="text-right">
                {lastSyncedAt ? <time dateTime={lastSyncedAt}>{syncDetails}</time> : syncDetails}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-4">
              <dt className="font-medium">Pending changes</dt>
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
