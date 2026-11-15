#!/bin/bash
# Retry staging + committing the XO TipJar repo despite the flaky overlay
# writes (EPERM on write, intermittent). Run in background; logs to
# tools/retry-commit.log. Safe to re-run: git add/commit are idempotent.
cd ~/workspace/makefun/xo-tipjar || exit 1
LOG=tools/retry-commit.log
echo "=== retry-commit started $(date) ===" >> "$LOG"

clean_tmp() { find .git/objects -name "tmp_obj_*" -delete 2>/dev/null; }

try_add() {
  local f="$1" tries="${2:-10}" i=0
  while [ $i -lt $tries ]; do
    if git add "$f" 2>>"$LOG"; then
      echo "STAGED: $f (try $((i+1)))" >> "$LOG"
      return 0
    fi
    clean_tmp
    sleep 10
    i=$((i+1))
  done
  echo "FAILED: $f after $tries tries" >> "$LOG"
  return 1
}

# Batch 1: source + small docs (no bundle yet)
for f in index.html package.json vite.config.js src/main.js src/style.css \
         docs/index.html docs/assets/index-jqPPl7Aj.css \
         tools/headless-check.mjs tools/crash-probe.mjs tools/firefox-probe.mjs \
         tools/package.json tools/package-lock.json package-lock.json; do
  try_add "$f" 10
done
git -c user.name="xo-tipjar" -c user.email="xo-tipjar@local" commit -qm "XO TipJar — app source, built CSS + HTML, verification tools" >>"$LOG" 2>&1
echo "commit2 exit=$? $(git log --oneline -1 2>/dev/null)" >> "$LOG"

# Batch 2: the big built JS bundle (may never fit through the throttle)
try_add "docs/assets/index-D6-E-KUN.js" 20
git -c user.name="xo-tipjar" -c user.email="xo-tipjar@local" commit -qm "XO TipJar — built JS bundle (docs/assets)" >>"$LOG" 2>&1
echo "commit3 exit=$? $(git log --oneline -1 2>/dev/null)" >> "$LOG"

echo "=== retry-commit finished $(date) ===" >> "$LOG"
git status --short >> "$LOG"
git log --oneline >> "$LOG"
cat "$LOG"
