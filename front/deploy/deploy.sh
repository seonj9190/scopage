#!/usr/bin/env bash
# Pull the latest code, install exact locked dependencies, rebuild, and
# restart the running app under pm2.
#
# Usage (run from anywhere): ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "커밋되지 않은 변경사항이 있어 배포를 중단합니다:" >&2
  git status --short
  exit 1
fi

git pull --ff-only
npm ci
npm run build

if pm2 describe scopage > /dev/null 2>&1; then
  pm2 restart scopage
else
  pm2 start server.cjs --name scopage
fi

echo "배포 완료."
