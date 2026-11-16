# Codebase review

Reviewed on 2026-11-16: application routes, training screens and dialogs, local
store and migration code, sync client and server, authentication, database schema
and migrations, navigation, onboarding, service worker, deployment configuration,
dependencies, and existing tests.

## Corrections

| Area               | Corrected behavior                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local edits        | Weight and notes save immediately to browser storage, including before navigation. Changing exercises resets open dialogs and local progress selections.                                                                                          |
| Editing options    | Saving an exercise dialog preserves weight, notes and order received through sync while it was open.                                                                                                                                              |
| Validation         | Client and server share workout/exercise rules. Names are trimmed, defaults are stored, and validation messages describe the problem. Weight steps respect PostgreSQL's two-decimal precision; weight arithmetic avoids floating point artifacts. |
| Logs               | Moving between exercises clears selected logs, preventing deletion of a previous exercise's selected sets.                                                                                                                                        |
| Workout drafts     | Creating an exercise after changing workouts targets the current workout. Sorting resets on workout changes and includes exercises added or removed during sync.                                                                                  |
| Sync queue         | Requests use batches of at most 200 operations. Deletes survive an in-flight add. Pending workout adds preserve server exercises during replay.                                                                                                   |
| Sync lifecycle     | Failed initial reconciliation retries correctly. Old account responses are ignored; requests check the expected account. Failed conflicts retain local changes. Idle edits batch for 300 ms.                                                      |
| Server updates     | Timestamp conditions in database updates prevent concurrent stale updates from overwriting newer records. Unused legacy sync actions were removed.                                                                                                |
| Email              | Provider errors reject centrally, so verification, password reset and magic links cannot report delivery success after an API failure.                                                                                                            |
| Account forms      | Cancel buttons cannot submit changes. Recent passwordless sessions can delete their account; expired sessions get a reauthentication message. Verification actions reject malformed runtime input.                                                |
| Navigation and PWA | Account pages can leave the offline shell after reconnecting. Links preserve cancellation, replacement and scroll options. The onboarding menu is accessible by keyboard and desktop button.                                                      |
| Hydration          | React's external-store subscription replaces effect-driven state copying. Server rendering and unavailable browser storage are handled.                                                                                                           |

## Maintenance

- Updated Next.js and its ESLint configuration together to 16.4.6, React to
  19.3.1, and Better Auth plus passkeys together to 1.7.25. Updated compatible
  dependencies and the Bun lockfile; Happy DOM moved to the patched 21.0.4.
- Removed unused direct dependencies and the unused debounce hook. The shadcn
  build/development tool is now a development dependency; its CSS import remains.
- Added automatic test discovery with a fresh process per suite. Added regression
  coverage for the concrete failures above and a `typecheck` script.
- Better Auth 1.7.25 matches the existing schema. See the README's upgrade notes
  for an existing-account duplicate check and deployment verification.

## Verification and limits

Lint, TypeScript, all 127 tests in 19 isolated test files, and the production build
with service-worker generation passed. HTTP smoke checks returned 200 for home,
login, account, offline, workout and exercise routes, the manifest, and the service
worker; its no-store headers were also checked. The temporary server was stopped.
The build used placeholder auth/email
credentials, as in the Dockerfile. Google credential warnings are expected in
that environment.

Database ownership and batching tests mock database calls. This review did not
exercise a live PostgreSQL server, production Google OAuth/email credentials,
real WebAuthn hardware, or installation/offline behavior on mobile browsers.
Explicit sign-out retains the existing behavior of clearing this browser's data,
including any unsynced changes.

`bun audit` still reports these transitive development-tool advisories:

| Package   | Severity | Dependency path / follow-up                                                                                                          |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| deepmerge | Low      | shadcn registry tooling; await an upstream fixed dependency.                                                                         |
| esbuild   | Moderate | drizzle-kit's legacy loader; concerns its development server, which the app does not run. Await a compatible upstream loader update. |
| minimatch | Moderate | shadcn → ts-morph; await an upstream range update to a patched version.                                                              |

No critical or high advisories remain in the installed dependency audit. Major
transitive overrides were avoided because the older tools may rely on their
existing APIs.
