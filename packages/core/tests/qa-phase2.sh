#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_BASE="${1:-/tmp/debug/scripts/ralph-gpu-phase2-qa}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$OUT_BASE/logs/$STAMP"
mkdir -p "$RUN_DIR"

TEST_LOG="$RUN_DIR/pnpm-test.log"
TYPECHECK_LOG="$RUN_DIR/pnpm-typecheck.log"
EXPORT_LOG="$RUN_DIR/export-check.log"
SUMMARY="$RUN_DIR/summary.txt"

cd "$CORE_DIR"

echo "[qa] running pnpm test" | tee "$SUMMARY"
if pnpm test >"$TEST_LOG" 2>&1; then
  echo "TEST_STATUS=0" | tee -a "$SUMMARY"
else
  status=$?
  echo "TEST_STATUS=$status" | tee -a "$SUMMARY"
fi

echo "[qa] running pnpm typecheck" | tee -a "$SUMMARY"
if pnpm typecheck >"$TYPECHECK_LOG" 2>&1; then
  echo "TYPECHECK_STATUS=0" | tee -a "$SUMMARY"
else
  status=$?
  echo "TYPECHECK_STATUS=$status" | tee -a "$SUMMARY"
fi

echo "[qa] checking exports" | tee -a "$SUMMARY"
node <<'NODE' >"$EXPORT_LOG" 2>&1
const fs = require('fs');
const path = require('path');
const context = fs.readFileSync(path.join(process.cwd(),'src/context.ts'),'utf8');
const index = fs.readFileSync(path.join(process.cwd(),'src/index.ts'),'utf8');
const types = fs.readFileSync(path.join(process.cwd(),'src/types.ts'),'utf8');

function check(name, cond) {
  console.log(`${name}=${cond ? 'OK' : 'MISSING'}`);
  if (!cond) process.exitCode = 1;
}

check('gpu.isHeadlessSupported function', /isHeadlessSupported\s*\(\)\s*:\s*boolean/.test(context));
check('gpu.initHeadless function', /async\s+initHeadless\s*\(/.test(context));
check('HeadlessGPUContextOptions in types', /export\s+interface\s+HeadlessGPUContextOptions\s+extends\s+GPUContextOptions/.test(types));
check('HeadlessGPUContextOptions exported from index', /export\s+type\s*\{\s*HeadlessGPUContextOptions\s*\}\s+from\s+"\.\/types"/.test(index));
NODE
if [[ $? -eq 0 ]]; then
  echo "EXPORT_STATUS=0" | tee -a "$SUMMARY"
else
  status=$?
  echo "EXPORT_STATUS=$status" | tee -a "$SUMMARY"
fi

echo "[qa] complete" | tee -a "$SUMMARY"
echo "$RUN_DIR"
