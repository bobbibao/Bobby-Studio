# Bobby Studio API. Build context: server-api/
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn prisma generate && yarn build
# node_modules is kept whole on purpose: the Prisma CLI inside the image runs `migrate deploy` as a release step.

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app bobby
COPY --from=build --chown=bobby /app/node_modules ./node_modules
COPY --from=build --chown=bobby /app/dist ./dist
COPY --from=build --chown=bobby /app/prisma ./prisma
COPY --from=build --chown=bobby /app/package.json ./package.json
USER bobby
EXPOSE 3000
# Readiness checks PostgreSQL and Redis; the orchestrator should use /api/health/ready for probes.
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations run as a separate release step: `node_modules/.bin/prisma migrate deploy` (see docs/delivery/deployment.md).
CMD ["node", "dist/src/main"]
