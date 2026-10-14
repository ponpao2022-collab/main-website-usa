#!/bin/bash
set -e
export PATH="$HOME/.local/bin:$PATH"
export GIT_EXEC_PATH="$HOME/.local/usr/lib/git-core"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

VPS_TARGET="${VPS_HOST:-${VPS_IP}}"
SECRET_KEY="${DEPLOY_SECRET}"

if [ -z "$VPS_TARGET" ] || [ -z "$SECRET_KEY" ]; then
  echo "❌ Error: VPS_HOST or DEPLOY_SECRET is not configured in .env"
  exit 1
fi

COMMIT_MSG="${1:-Auto-update: website improvements}"

echo "================================================="
echo "🚀 AUTO-PUSH TO GITHUB & AUTO-DEPLOY TO VPS"
echo "================================================="

echo ">>> 1. Checking git status..."
git status -s

echo ">>> 2. Adding changes and committing..."
git add -A
git commit -m "$COMMIT_MSG" || echo "No new local changes to commit."

echo ">>> 3. Pushing to GitHub main branch..."
git push origin main

echo ">>> 4. Triggering auto-deploy on VPS..."
RESPONSE=$(curl -s -m 10 -X POST "http://${VPS_TARGET}/api/system/deploy?secret=${SECRET_KEY}" || echo '{"success":false}')
echo "VPS Response: $RESPONSE"

echo "================================================="
echo "✅ SUCCESS! Deployed to GitHub and VPS!"
echo "   Site: https://topusanewsstory.com"
echo "   CMS:  Configured via private ADMIN_PATH"
echo "================================================="

