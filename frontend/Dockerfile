# TripOps Web: build React (Vite) rồi phục vụ bằng Caddy (tự cấp HTTPS, proxy /api và /hubs sang API).
# Build từ thư mục gốc repo:  docker build -f frontend/Dockerfile --build-arg PUBLIC_APP_URL=https://tripops.online -t tripops-web .

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ARG PUBLIC_APP_URL=""
# API cùng tên miền (/api, /hubs) nên để trống VITE_API_BASE_URL.
ENV VITE_API_BASE_URL="" \
    VITE_PUBLIC_APP_URL=${PUBLIC_APP_URL} \
    NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
