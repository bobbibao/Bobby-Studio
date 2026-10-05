# Static web build served by nginx. Build context: frontend/
# VITE_* values are public and baked at build time; never pass secrets as build args.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG VITE_BOBBY_BE_API
ARG VITE_API_SOCKET_URL
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_BOBBY_BE_API=$VITE_BOBBY_BE_API VITE_API_SOCKET_URL=$VITE_API_SOCKET_URL \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
RUN yarn build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
