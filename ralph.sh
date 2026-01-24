#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# jq filter to extract streaming text from assistant messages
stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

# jq filter to extract tool calls with formatted output
stream_tools='select(.type == "assistant").message.content[]? | select(.type == "tool_use") | "\n🔧 TOOL CALL: " + .name + "\n   Input: " + (.input | tostring | gsub("\n"; " ")) + "\n"'

# jq filter to extract final result
final_result='select(.type == "result").result // empty'

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "=========================================="
  echo "Iteration $i of $1"
  echo "=========================================="
  echo ""
  
  tmpfile=$(mktemp)
  rawfile=$(mktemp)
  trap "rm -f $tmpfile $rawfile" EXIT

  echo "Starting Claude execution..."
  echo ""

  claude \
    --verbose \
    --print \
    --dangerously-skip-permissions \
    --output-format stream-json \
    "claude --dangerously-skip-permissions --permission-mode acceptEdits -p @PRD.md @progress.txt \
  1. Find the highest-priority task and implement it. \
  2. Run your tests and type checks. \
  3. Update the PRD with what was done. \
  4. Append your progress to progress.txt. \
  5. Commit your changes. \
  ONLY WORK ON A SINGLE TASK. \
  If the PRD is complete, output <promise>COMPLETE</promise>." \
  2>&1 | tee "$rawfile" | grep --line-buffered '^{' | tee "$tmpfile" | while IFS= read -r line; do
    # Extract and display text
    echo "$line" | jq --unbuffered -rj "$stream_text" 2>/dev/null || true
    # Extract and display tool calls
    echo "$line" | jq --unbuffered -rj "$stream_tools" 2>/dev/null || true
  done

  echo ""
  echo "--- Raw output (last 20 lines) ---"
  tail -n 20 "$rawfile" | grep -v '^{' || true
  echo ""

  result=$(jq -r "$final_result" "$tmpfile" 2>/dev/null || echo "")

  echo ""
  echo "--- Checking completion status ---"
  
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "✅ Ralph complete after $i iterations."
    exit 0
  else
    echo "Continuing to next iteration..."
    echo ""
  fi
done

echo ""
echo "Reached maximum iterations ($1). Exiting."
