# ============================================================
# Stage 1: build
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace manifests first (layer cache for npm ci)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Copy packages/shared sources before npm ci so the `prepare` script
# (which runs `tsc -p tsconfig.json`) can find tsconfig.json
COPY packages/shared ./packages/shared

# Install all workspace deps (also runs packages/shared prepare → build)
RUN npm ci --workspaces --include-workspace-root

# Copy API source code
COPY apps/api ./apps/api

# Build shared (idempotent — prepare already ran it, but explicit is safer)
RUN npm run build -w packages/shared

# Generate Prisma client
RUN cd apps/api && npx prisma generate && cd ../..

# Build API
RUN npm run build -w apps/api

# ============================================================
# Stage 2: runtime
# ============================================================
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy hoisted node_modules (includes .prisma client)
COPY --from=build /app/node_modules ./node_modules

# Copy packages/shared so the workspace symlink target exists
COPY --from=build /app/packages/shared ./packages/shared

# Copy API build artifacts
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# tsconfig is needed by ts-node when running `npx prisma db seed` in the container
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json

# Copy root package.json (needed by workspace resolution)
COPY --from=build /app/package.json ./package.json

# Note: keeping full node_modules (dev deps included) for MVP —
# avoids complex workspace-aware pruning; acceptable image size tradeoff.

WORKDIR /app/apps/api

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
