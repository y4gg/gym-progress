# Gym Progress

This is a gym progress tracker, build to suit my style of web apps. The focus in this project was definetily on mobile UI, because that is where this website shall be used the most.
No one is gonna bring a pc to the gym, but the website is still freindily to PC's to desgin splits in front of the big screen, which is again a preference of mine.

---

## AI usage disclaimer:

This project was started before I even knew about stardance, aswell with a goal that did not account for stardance, but better to ship than not to ship right? My original goal with this project was not just to design a gym tracker tailored to me, but also to expiriment with "vibe engeneering" - a term used to describe using AI alongside strict guidance to create producation ready apps, which diffres from vibe coding where you just let AI agents do whatever, as long as the goal is achived. I did not do that from the start tho, because the stack, frontend page layout & functionallity where implemented by me, which might not seems like much but the app has a full client side store & functions without account (no backend involved). The server tho, was almost exclusivily made with vibe engeneering, aswell as the mobile friendily redesign. The vibe engeneering was done in t3code, and I got the vibe engeneering idea from @t3.gg, according to him, the future will consist of engeneers who will be able to use AI correctily, and according to him, vibe engeneering is that way.

## Features:

0. Client side store
1. Exercise tracking grouped into workouts
2. Mobile friendily UI
3. Multi device sync
4. Weight incrase suggestions
5. Wight & Set logging
6. Offline workout tracking

## Offline use

Open the production app once while connected and allow the service worker to
finish installing. After that, you can reopen or refresh the app, create workouts
and exercises, log sets, and view history without a connection. Screens do not
need to have been visited first. Set logging also works without an account.

Workouts, logs, and pending sync changes stay in this browser's local storage.
Signed-in accounts resume syncing when the connection returns. Sign-in and account
management require a connection. The offline app has a Reconnect button to reopen
the current screen from the server when it is available again.

Offline support requires HTTPS or localhost and a browser with service worker
support. It runs in production builds only. Use `bun run build` and `bun run start`
to test it locally. The build generates `public/sw.js` with a versioned cache of
the offline app, JavaScript, CSS, and locally served fonts. Updates activate after
existing app tabs close. Clearing browser site data removes offline files and
locally saved workouts, so sync any changes first.

## How to deploy

0. Install bun
1. cd into project dir
2. Get enviroment variables
3. `bun i`
4. `bun run build`
5. `bun run start`

### Dokploy

Select **Dockerfile** as the build type, set the Dockerfile path to `Dockerfile`
and the Docker context path to `.`. Leave the build stage unset to use the final
runtime stage, and set your domain's container port to **3000**.

In Dokploy's Environment tab, configure the runtime variables listed in
`.env.example`. Set `BETTER_AUTH_URL` to your public HTTPS URL and
`BETTER_AUTH_SECRET` to a random secret of at least 32 characters. Use a PostgreSQL
connection URL reachable from the container for `DATABASE_URL`, and configure
Resend and Google OAuth with your production credentials. The Resend account must
be able to send from `noreply@updates.y4.gg`, the sender currently used by the app.

Apply the committed database migrations to your PostgreSQL database separately
before using account and sync features; the container does not run migrations.
From a checkout with dependencies installed and `DATABASE_URL` configured, run
`bunx drizzle-kit migrate`.

To build and run the same image locally:

```sh
docker build -t gym-progress .
docker run --rm -p 3000:3000 --env-file .env gym-progress
```

The image installs dependencies using the Bun lockfile and runs the Next.js
standalone server as a non-root user. Local `.env` files are excluded from the
build context, so no production credentials are needed to build the image. The
build uses placeholders solely to initialize auth and email during compilation;
set the real auth and email credentials at runtime. Building also requires
network access to download the Google fonts used by the app.
