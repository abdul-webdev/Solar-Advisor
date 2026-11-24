#!/usr/bin/env bash
# Starts the full application (API + built interface) on port 5000 when the
# container starts. Idempotent: does nothing if it is already running.
set -u

cd "$(dirname "$0")/.." || exit 0

if curl -fsS http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "Solar Advisor is already running on port 5000"
  exit 0
fi

if [ ! -d frontend/dist ]; then
  echo "Building frontend (first run only)…"
  (cd frontend && npm install --no-audit --no-fund && npm run build) || exit 0
fi

echo "Starting Solar Advisor on port 5000…"
cd backend
nohup python run.py > /tmp/solar-advisor.log 2>&1 &
sleep 4
if curl -fsS http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "Solar Advisor is live on port 5000 — open the Ports tab and click port 5000."
else
  echo "Startup did not complete; see /tmp/solar-advisor.log"
fi
