# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS bun
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder
COPY . .
# Keep this directory available even when the app has no public assets yet.
RUN mkdir -p public
# Auth and email initialize during compilation. These build-only placeholders
# are not runtime defaults; supply real credentials in Dokploy's Environment tab.
RUN RESEND_API_KEY=re_build_placeholder \
    BETTER_AUTH_SECRET=docker-build-only-placeholder-secret \
    BETTER_AUTH_URL=http://localhost:3000 \
    bun run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nextjs \
    && useradd --uid 1001 --gid nextjs --no-create-home --shell /usr/sbin/nologin nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
