# Spotter's production image, for Google Cloud Run (or any container host).
# Settings are read at runtime: the database (DATABASE_URL, or DB_HOST, DB_NAME,
# DB_USER and DB_PASSWORD), BETTER_AUTH_SECRET and BETTER_AUTH_URL.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Tools image: the full project, for one-off jobs like database migrations
# (npx tsx scripts/migrate.mts) and creating logins (scripts/create-user.mts).
FROM build AS tools
CMD ["npx", "tsx", "scripts/migrate.mts"]

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 8080
CMD ["node", "server.js"]
