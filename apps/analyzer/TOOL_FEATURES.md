# Tool Details & Overview Features

## Overview
Added two major features to enhance tool call analysis in Ralph Analyzer.

## Feature 1: Tool Call Details in Timeline

### Location
Individual trace pages (`/trace/[taskId]`) - Timeline section

### What's Displayed
Each tool call now shows additional details in gray text:

**Before:**
```
✓ bash (123ms)
```

**After:**
```
✓ bash (123ms)
  command: "cd apps/analyzer && pnpm dev" • exit 0, 15 lines
```

### Tool-Specific Formatting
- **bash**: Shows command (truncated to 60 chars) + result summary
- **readFile/writeFile**: Shows file path + result
- **openBrowser**: Shows URL
- **Generic tools**: Shows first relevant argument + result

### Implementation Details
- Extracts args from `ToolCallEvent.args`
- Extracts result from `ToolResultEvent.resultSummary`
- Truncates long values with ellipsis
- Gray text (`text-foreground-muted`) for subtlety
- Single line with `truncate` class

## Feature 2: Tool Overview Page

### Access
Click any tool name from:
1. Homepage "Tool Usage Distribution" grid
2. Trace detail "Tool Statistics" grid

### URL Pattern
`/tool/[toolName]` (e.g., `/tool/bash`)

### Page Contents

#### Header
- Tool name in monospace font
- "Back to Overview" button
- Subtitle: "Tool usage analysis across all ralph traces"

#### Key Stats (4 cards)
- **Total Calls**: Across all traces
- **Avg Duration**: Average execution time
- **Success Rate**: Percentage of successful calls
- **Errors**: Total error count

#### Charts (2 charts)
1. **Top 10 Tasks** - Horizontal bar chart showing which tasks use this tool most
2. **Success vs Errors** - Pie chart showing success/error ratio

#### Task List
- All tasks that use this tool
- Shows call count and average duration per task
- Clickable to navigate to trace detail page

### Example: bash Tool Overview
```
bash
Tool usage analysis across all ralph traces

Total Calls: 1,941
Avg Duration: 836ms
Success Rate: 99.7%
Errors: 0

Top 10 Tasks:
- 26-advanced-examples: 170 calls
- 18-uniforms: 137 calls
- 27-api-docs: 89 calls
...

[Bar chart visualization]
[Pie chart: Success vs Errors]

All Tasks Using This Tool:
- 26-advanced-examples: 170 calls, 53ms avg [click to view]
- 18-uniforms: 137 calls, 1203ms avg [click to view]
...
```

## Technical Implementation

### Files Created/Modified
1. `components/Timeline.tsx` - Added tool detail formatting
2. `lib/types.ts` - Added ToolOverview interface
3. `lib/trace-loader.ts` - Added getToolOverview function
4. `app/api/tools/[toolName]/route.ts` - API endpoint
5. `components/OverviewStats.tsx` - Made tools clickable
6. `components/ToolUsage.tsx` - Made tools clickable
7. `components/ToolOverview.tsx` - New component
8. `app/tool/[toolName]/page.tsx` - Tool overview page

### Data Aggregation
The `getToolOverview` function:
- Filters all `tool_call`, `tool_result`, and `tool_error` events
- Groups by task
- Calculates totals and averages
- Sorts by usage count

### Navigation Flow
```
Homepage
  → Click "bash" in Tool Usage
    → /tool/bash page
      → Click "26-advanced-examples"
        → /trace/26-advanced-examples
```

## Testing Results
✅ Tool details show in trace timeline
✅ Args formatted correctly (bash, readFile, writeFile)
✅ Results displayed
✅ Truncation works for long values
✅ Tools clickable on homepage
✅ Tool overview page loads
✅ Stats calculated correctly (1,941 calls, 836ms avg)
✅ Charts render properly
✅ Task list navigation works
✅ Back button returns to homepage

## UI Enhancements
- Consistent dark theme
- Hover states on clickable tools
- Smooth transitions
- Responsive layouts
- Persistent sidebar navigation
