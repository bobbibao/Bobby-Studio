# Bobby Studio worker. Build context: worker/
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
RUN yarn install --frozen-lockfile --production --prefer-offline

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production WORKER_HEALTH_HOST=0.0.0.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app bobby
COPY --from=build --chown=bobby /app/node_modules ./node_modules
COPY --from=build --chown=bobby /app/dist ./dist
COPY --from=build --chown=bobby /app/package.json ./package.json
USER bobby
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||3100)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# SIGTERM stops claiming new jobs and lets in-flight work finish; give the container a stop grace period >= 60s.
CMD ["node", "dist/main"]
