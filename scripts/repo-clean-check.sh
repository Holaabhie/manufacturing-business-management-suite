#!/usr/bin/env bash
# ==============================================================================
# Repository Cleanliness Verification Script
# Verifies that sensitive paths and historical artifact bloat are completely
# purged from git history before or after repository migration.
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo " Running Git History Cleanliness Audit..."
echo "=========================================================="

# List of sensitive or bloat paths that must NOT exist in git history
BLOCKED_PATTERNS=(
  "tally-spike-output"
  "\.env\.local$"
  "apps/web/\.env\.local$"
  "apps/api/\.env"
  "\.env\.production"
  "\.pem$"
  "\.key$"
  "\.sql$"
  "\.bson$"
)

FAILED=0

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  echo -n "Checking for historical commits containing: $pattern ... "
  MATCHES=$(git log --all --name-only --pretty=format: | grep -E "$pattern" || true | sort -u)
  
  if [ -n "$MATCHES" ]; then
    echo "FAILED"
    echo "  Found matching historical paths:"
    echo "$MATCHES" | while read -r line; do
      echo "    - $line"
    done
    FAILED=1
  else
    echo "CLEAN"
  fi
done

echo "----------------------------------------------------------"
if [ "$FAILED" -eq 1 ]; then
  echo "❌ AUDIT FAILED: Sensitive or bloated paths exist in git history."
  echo "Run 'git filter-repo' per docs/REPO-MOVE.md before pushing to clean repo."
  exit 1
else
  echo "✅ AUDIT PASSED: Repository history is clean of blocked artifacts."
  exit 0
fi
