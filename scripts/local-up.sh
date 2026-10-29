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
    # After a container restart, a leftover pid file can point at an unrelated
    # process and stop dockerd from starting.
    pid_file=/var/run/docker.pid
    if [ -f "$pid_file" ] && ! ps -p "$(cat "$pid_file")" -o comm= 2>/dev/null | grep -q dockerd; then
      rm -f "$pid_file"
    fi
    setsid nohup dockerd >/tmp/dockerd.log 2>&1 </dev/null &
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  docker info >/dev/null 2>&1 || { echo "Docker isn't running. Start Docker Desktop and try again."; exit 1; }
fi

echo "Starting Supabase (the first run downloads images and takes a few minutes)..."
# Skip services Spotter doesn't use yet, to start faster and use less memory.
# The database can take a while to become healthy right after Docker starts,
# so retry a few times.
start_supabase() {
  npx supabase start -x edge-runtime,logflare,vector,imgproxy,studio,postgres-meta,realtime,supavisor,storage-api >/tmp/supabase-start.log 2>&1
}
for attempt in 1 2 3 4; do
  start_supabase && break
  if [ "$attempt" = 4 ]; then
    tail -20 /tmp/supabase-start.log
    exit 1
  fi
  echo "Supabase isn't ready yet, trying again in 15 seconds..."
  sleep 15
done

if [ ! -f .env.local ]; then
  echo "Creating .env.local..."
  npx supabase status -o env | sed -n \
    -e 's/^API_URL=/NEXT_PUBLIC_SUPABASE_URL=/p' \
    -e 's/^PUBLISHABLE_KEY=/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/p' \
    -e 's/^SECRET_KEY=/SUPABASE_SECRET_KEY=/p' >.env.local
fi

npm run -s db:seed
echo "Ready. Run \`npm run dev\` and open http://localhost:3000"
