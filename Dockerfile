# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Production image for AWS Lightsail (see docs/deploy-lightsail.md).
# Build ONE image per release and run it on every container/server — Server
# Action encryption and deployment ids must match across instances.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://kaydyachaanifaydyach.com \
#     --build-arg DEPLOYMENT_ID=$(git rev-parse --short HEAD) \
#     --secret id=actions_key,env=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY \
#     -t kaf-web .
#
# Server-only secrets (service role, Razorpay, Interakt, ...) are NOT build
# inputs — they are passed at runtime via the env file on the server.
# ---------------------------------------------------------------------------

ARG NODE_IMAGE=node:22-alpine

# ---------- deps: install exactly what package-lock.json pins ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- build ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public values are inlined into client JS at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG DEPLOYMENT_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    DEPLOYMENT_ID=$DEPLOYMENT_ID \
    NEXT_TELEMETRY_DISABLED=1

# Stable Server Actions key (keeps admin forms working across containers and
# rolling deploys). Passed as a BuildKit secret so it isn't in layer history.
RUN --mount=type=secret,id=actions_key \
    if [ -s /run/secrets/actions_key ]; then \
      export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/actions_key)"; \
    fi; \
    npm run build

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

ARG DEPLOYMENT_ID
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
