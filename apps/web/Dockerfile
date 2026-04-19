FROM node:22-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM base AS builder

ARG API_INTERNAL_URL=http://127.0.0.1:8001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./

RUN npm run build

FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001

CMD ["node", "server.js"]