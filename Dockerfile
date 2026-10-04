# ---------------------------------------------------------------------------
# Production image for AWS Lightsail and Replov (see docs/deploy-lightsail.md).
# Build ONE image per release and run it on every container/server — Server
# Action encryption and deployment ids must match across instances.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://kaydyachaanifayddyacha.com \
#     --build-arg DEPLOYMENT_ID=$(git rev-parse --short HEAD) \
#     -t kaf-web .
#
# Server-only secrets (service role, Razorpay, Interakt, ...) are NOT build
# inputs — they are passed at runtime via the env file on the server.
#
# Keep this Dockerfile compatible with Docker's legacy builder. Replov does
# not currently enable BuildKit, so RUN --mount cache/secret directives cannot
# be used here.
# ---------------------------------------------------------------------------

ARG NODE_IMAGE=node:22-slim

# ---------- deps: install exactly what package-lock.json pins ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public values are inlined into client JS at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_META_PIXEL_IDS
ARG NEXT_PUBLIC_MEDIA_PROXY
ARG DEPLOYMENT_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_META_PIXEL_IDS=$NEXT_PUBLIC_META_PIXEL_IDS \
    NEXT_PUBLIC_MEDIA_PROXY=$NEXT_PUBLIC_MEDIA_PROXY \
    DEPLOYMENT_ID=$DEPLOYMENT_ID \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

ARG DEPLOYMENT_ID
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
