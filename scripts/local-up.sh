#!/usr/bin/env bash
# Start everything needed for local development: Docker, a local Supabase,
# .env.local, and the demo accounts. Safe to run again at any time.
# Usage: npm run local:up   (then `npm run dev` in another terminal)
set -euo pipefail
cd "$(dirname "$0")/.."

# Cloud containers (like Claude Code on the web) don't start Docker for you.
if ! docker info >/dev/null 2>&1; then
  if command -v dockerd >/dev/null 2>&1 && [ "$(id -u)" = "0" ]; then
    echo "Starting Docker..."
    setsid nohup dockerd >/tmp/dockerd.log 2>&1 </dev/null &
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  docker info >/dev/null 2>&1 || { echo "Docker isn't running. Start Docker Desktop and try again."; exit 1; }
fi

echo "Starting Supabase (the first run downloads images and takes a few minutes)..."
# Skip services Spotter doesn't use yet, to start faster and use less memory.
npx supabase start -x edge-runtime,logflare,vector,imgproxy,studio,postgres-meta,realtime,supavisor,storage-api >/dev/null

if [ ! -f .env.local ]; then
  echo "Creating .env.local..."
  npx supabase status -o env | sed -n \
    -e 's/^API_URL=/NEXT_PUBLIC_SUPABASE_URL=/p' \
    -e 's/^PUBLISHABLE_KEY=/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/p' \
    -e 's/^SECRET_KEY=/SUPABASE_SECRET_KEY=/p' >.env.local
fi

npm run -s db:seed
echo "Ready. Run \`npm run dev\` and open http://localhost:3000"
