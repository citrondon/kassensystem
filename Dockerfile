# syntax=docker/dockerfile:1
# Mon Comptoir POS — Produktiv-Image (ein Kunde = ein Container-Stack)
# Baut Frontend + Backend und liefert ein Runtime-Image analog zum Render-Setup:
# Start: node scripts/migrate.cjs up && node dist/server.js

# ── Stage 1: Frontend build ──
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend build (TypeScript → dist) ──
FROM node:20-alpine AS backend-build
# Build-Tools nur als Fallback, falls bcrypt kein musl-Prebuilt findet
RUN apk add --no-cache python3 make g++
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ── Stage 3: Runtime ──
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/backend

COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=backend-build /build/backend/migrations ./migrations
COPY --from=backend-build /build/backend/scripts ./scripts
COPY --from=backend-build /build/backend/package.json ./package.json
# Frontend-Build als dist-static (Konvention aus render.yaml / server.ts)
COPY --from=frontend-build /build/frontend/dist ./dist-static

EXPOSE 5000
CMD ["sh", "-c", "node scripts/migrate.cjs up && node dist/server.js"]
