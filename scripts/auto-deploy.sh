#!/bin/bash
set -e
export PATH="$HOME/.local/bin:$PATH"
export GIT_EXEC_PATH="$HOME/.local/usr/lib/git-core"

COMMIT_MSG="${1:-Auto-update: news app improvements and features}"

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

echo ">>> 4. Triggering auto-deploy on VPS (2.25.237.28)..."
RESPONSE=$(curl -s -m 10 -X POST "http://2.25.237.28/api/system/deploy?secret=main_website_usa_deploy_secret_2026" || echo '{"success":false}')
echo "VPS Response: $RESPONSE"

echo "================================================="
echo "✅ SUCCESS! Deployed to GitHub and VPS!"
echo "   Site: http://2.25.237.28"
echo "   CMS:  http://2.25.237.28/admin"
echo "================================================="
