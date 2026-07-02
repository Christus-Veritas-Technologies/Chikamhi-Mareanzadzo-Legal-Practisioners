# Build from the monorepo root: docker build -f apps/web/Dockerfile .
#
# Adapted from vva/apps/web/Dockerfile — same stack and monorepo shape (pnpm workspaces with
# the `catalog:` protocol, Next.js web app depending only on packages/env + packages/ui, no
# database dependency). stayzim's web Dockerfile was structurally similar but a looser match
# (plain `pnpm install` without the workspace-manifest layer-caching split), so this one is
# based on vva's, with the env var name swapped to match this repo's actual env schema.
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests for layer caching.
# packages/db is intentionally excluded — the web app has no database dependency (it only
# depends on @CMLP/env and @CMLP/ui — see apps/web/package.json).
COPY pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# NEXT_PUBLIC_SERVER_URL (packages/env/src/web.ts) is read at the top of next.config.ts and
# gets baked into the client bundle at build time — it is NOT read at container runtime.
# Override via: --build-arg NEXT_PUBLIC_SERVER_URL=https://your-api.example.com
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

RUN pnpm install --frozen-lockfile

# Source after install for better layer caching.
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

RUN pnpm --filter web build

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# next.config.ts doesn't set `output: "standalone"`, so `next start` needs the full
# node_modules tree rather than a pruned bundle — copied wholesale from the builder instead of
# reinstalled here.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["pnpm", "start"]
