# Execution Timeline Feature

## Overview
Added a visual timeline to the homepage showing all ralph task executions over time.

## Features

### 1. Timeline Visualization
- **Horizontal bars** represent each ralph execution
- **Bar position** = when the task started/ended on the time axis
- **Bar width** = duration of the execution
- **Bar color**:
  - Blue = successful execution
  - Red = execution with errors

### 2. Tool Call Density
- Visual indicator inside bars showing tool call frequency
- Vertical white lines = high tool call density
- More lines = more tools per second

### 3. Interactive Hover Tooltip
When hovering over any ralph execution, shows:
- **Task title** (e.g., "55-edge-cases-tests")
- **Duration** (e.g., "4m 51s")
- **Cost** (e.g., "$0.2247")
- **Tool Calls** (e.g., "80")
- **Iterations** (e.g., "7")
- **Errors** (if any)
- **Start time** (e.g., "Jan 14, 11:45 PM")
- **End time** (e.g., "Jan 14, 11:50 PM")

### 4. Click to Navigate
- Click any bar to navigate to that trace's detail page

### 5. Timeline Axis
- Shows date/time range from earliest to latest execution
- Automatically scales to fit all traces

### 6. Legend
- Color legend for successful vs error executions
- Tool call density indicator explanation

## Implementation Details

### File: `components/ExecutionTimeline.tsx`
- Filters traces with valid timestamps
- Calculates time bounds (min/max)
- Positions bars as percentages of total time range
- Calculates tool call density (tools per second)
- Renders tooltip on hover with all details
- Uses Next.js router for navigation on click

### Integration
- Added to homepage (`app/page.tsx`)
- Appears below the overview stats section
- Full width, scrollable

## Visual Design
- Dark theme consistent with app
- Smooth hover transitions
- Tooltip follows mouse cursor
- Task names shown on left of each bar
- Responsive layout

## Data Requirements
- Requires `startTime`, `endTime`, and `summary` data
- Gracefully handles missing data
- Shows "No timeline data available" if no valid traces

## Example Timeline Display
```
Jan 11, 10:54 PM ────────────────────────── Jan 14, 11:50 PM

55-edge-cases-tests    [████████] (291s, $0.22, 80 tools)
54-events-profiler...  [█████] (169s, $0.22, 51 tools)
52-compute-advanc...   [████] (117s, $0.22, 48 tools)
...
```

## Hover Tooltip Example
```
┌─────────────────────────┐
│ 55-edge-cases-tests     │
│                         │
│ Duration:      4m 51s   │
│ Cost:         $0.2247   │
│ Tool Calls:        80   │
│ Iterations:         7   │
│                         │
│ Started: Jan 14, 11:45  │
│ Ended:   Jan 14, 11:50  │
└─────────────────────────┘
```
