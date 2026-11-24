#!/usr/bin/env bash
# Build script used by Render (and any PaaS that supports a build command).
# Installs backend deps and compiles the React frontend into frontend/dist,
# which Flask then serves as the single deployed application.
set -euo pipefail

echo "==> Installing Python dependencies"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> Installing frontend dependencies"
cd frontend
npm ci --no-audit --no-fund

echo "==> Building frontend"
npm run build
cd ..

echo "==> Build complete (frontend/dist ready)"
