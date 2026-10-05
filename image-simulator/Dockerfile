# HTTP image simulator for development, CI and staging dry runs. Never a production dependency.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build && yarn install --frozen-lockfile --production --ignore-scripts

FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --system --uid 10001 --home /app bobby
COPY --from=build --chown=bobby /app/node_modules ./node_modules
COPY --from=build --chown=bobby /app/dist ./dist
COPY --from=build --chown=bobby /app/package.json ./package.json
USER bobby
EXPOSE 4010
CMD ["node", "dist/main.js"]
