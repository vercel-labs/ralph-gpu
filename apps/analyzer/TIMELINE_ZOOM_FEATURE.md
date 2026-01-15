# Interactive Timeline with Zoom

## Overview
Enhanced the execution timeline with full zoom/pan controls for detailed time analysis.

## Features

### 1. Zoom Controls
- **Zoom In/Out Buttons**: Located in timeline header
  - Zoom range: 1x to 10x
  - Each click = 1.5x multiplier
  - Buttons disable at limits
- **Mouse Wheel Zoom**: Hold Ctrl (or Cmd on Mac) + scroll
  - Smooth, continuous zoom
  - More precise than buttons
- **Reset Button**: Returns to 1x zoom and resets pan
- **Zoom Level Display**: Shows current zoom (e.g., "1.5x", "3.4x")

### 2. Pan Controls
- **Click and Drag**: Grab timeline and drag left/right
  - Only works when zoomed in
  - Constrained to valid range
- **Visual Feedback**: Cursor changes to "grabbing" while dragging
- **Smooth Transition**: Animates when not dragging

### 3. Dynamic Time Axis
- Updates based on current zoom and pan position
- Shows visible time range
- Example: "Jan 11, 10:54 PM" → "Jan 13, 11:31 PM"

### 4. Color Logic (Updated)
- **Blue bars** = Task completed successfully (called "done" tool)
- **Red bars** = Task did not complete (no "done" call)
- No longer based on tool errors
- Errors shown separately in tooltip

### 5. Hover Tooltip Enhancement
Shows comprehensive task info:
- Task title
- **Duration** (e.g., "4m 51s")
- **Cost** (e.g., "$0.2247")
- **Tool Calls** (e.g., "80")
- **Iterations** (e.g., "7")
- **Status** (Completed/Incomplete) - colored appropriately
- **Errors** (if any) - shown in yellow
- **Start time** (e.g., "Jan 14, 11:45 PM")
- **End time** (e.g., "Jan 14, 11:50 PM")

### 6. Tool Call Density
- Vertical white lines inside bars
- Calculated as: tools per second
- Shows activity level during execution
- More lines = more active execution

## Usage Instructions

1. **View Full Timeline**: Default view shows all traces
2. **Zoom In**: Click zoom button or Ctrl+scroll up
3. **Zoom Out**: Click zoom out button or Ctrl+scroll down
4. **Pan**: When zoomed, click and drag the timeline left/right
5. **Hover**: Move mouse over any bar to see details
6. **Navigate**: Click any bar to view full trace analysis
7. **Reset**: Click reset button to return to default view

## Technical Implementation

### State Management
- `zoom`: 1-10 multiplier
- `pan`: Horizontal offset in pixels
- `isDragging`: Mouse drag state
- `hoveredTask`: Currently hovered task
- `mousePos`: Tooltip position

### Calculations
- Visible time range = base range / zoom level
- Bar position = ((start - minTime) / baseRange) * 100%
- Bar width = (duration / baseRange) * 100%
- Pan constraint = (zoom - 1) * container width

### Interactions
- Mouse down on track = start drag
- Mouse move + dragging = update pan
- Mouse up anywhere = end drag
- Mouse enter bar = show tooltip
- Mouse leave bar = hide tooltip
- Click bar = navigate to detail page

## Examples

### Before Zoom (1x)
```
Jan 11, 10:54 PM ──────────────────── Jan 14, 11:50 PM
[████████████████████████████████████████████]
```

### After Zoom (3.4x)
```
Jan 11, 10:54 PM ──────── Jan 12, 08:31 PM
[█████████████████████]
     ^-- Zoomed region
```

### Tool Call Density
```
Low activity:  [████████]
High activity: [█|█|█|█|█] (vertical lines)
```

## Color Meanings

| Color | Meaning | Indicator |
|-------|---------|-----------|
| Blue  | Task called "done" tool | Success |
| Red   | Task never called "done" | Incomplete |
| Vertical lines | Tool call density | Activity level |
