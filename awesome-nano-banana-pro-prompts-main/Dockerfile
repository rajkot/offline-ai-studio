# ---- Stage 1: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY website/package.json website/package-lock.json ./
RUN npm ci

COPY website/ ./
RUN npm run build

# ---- Stage 2: Serve ----
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN npm ci --omit=dev --ignore-scripts

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
