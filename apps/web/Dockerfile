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

# Copy web source code
COPY apps/web ./apps/web

# Build shared (idempotent)
RUN npm run build -w packages/shared

# Build Angular SSR web app
RUN npm run build -w apps/web

# ============================================================
# Stage 2: runtime
# ============================================================
FROM node:20-alpine AS runtime

WORKDIR /app/dist

# Copy the Angular SSR build output (contains browser/ and server/ bundles)
COPY --from=build /app/apps/web/dist/fishing-in-ukraine ./

# Verification: server.mjs imports only 'node:module' and built-in 'stream' —
# Express and all Angular deps are inlined by esbuild. node_modules are NOT
# required at runtime. We copy them anyway as a safety net (idempotent).
COPY --from=build /app/node_modules /app/node_modules

ENV PORT=4000

EXPOSE 4000

# server.mjs is at dist/fishing-in-ukraine/server/server.mjs
# We set WORKDIR to that dist dir above, so the path is ./server/server.mjs
CMD ["node", "server/server.mjs"]
