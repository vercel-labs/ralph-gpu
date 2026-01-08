# Playwright MCP Setup for Visual Verification

The Ralph agent can use **Playwright MCP** to visually verify the shader examples. This is highly recommended for Phase 3 to ensure the WebGPU rendering actually works.

## Why Visual Testing?

For a shader library, visual verification is critical:

- ✅ Verify shaders actually render (not just compile)
- ✅ Detect blank/black screens
- ✅ Check for console errors in browser
- ✅ Test interactivity (mouse input, animations)
- ✅ Compare screenshots to expected output

Without visual testing, the agent can only verify that code compiles and builds, not that it actually works!

## Setup Methods

### Method 1: Using Cursor's Built-in Playwright MCP (Recommended)

If you're running this in Cursor with Composer, Playwright MCP is already available:

1. **Enable in environment**:
   ```bash
   # In ralph/.env
   ENABLE_PLAYWRIGHT_MCP=true
   ```

2. **Run the agent**:
   ```bash
   cd ralph
   pnpm agent
   ```

The agent will automatically use Playwright MCP tools when available.

### Method 2: Manual MCP Server Setup

If running outside Cursor, you need to set up the Playwright MCP server:

1. **Install Playwright MCP**:
   ```bash
   npm install -g @playwright/mcp-server
   ```

2. **Configure MCP**:
   
   Create `mcp-config.json`:
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "playwright-mcp-server",
         "args": [],
         "env": {}
       }
     }
   }
   ```

3. **Enable in Ralph**:
   ```bash
   # In ralph/.env
   ENABLE_PLAYWRIGHT_MCP=true
   MCP_CONFIG_PATH=./mcp-config.json
   ```

4. **Run with MCP**:
   ```bash
   cd ralph
   # The agent will connect to Playwright MCP automatically
   pnpm agent
   ```

## What Gets Tested

When Playwright MCP is enabled, Phase 3 verification will:

### 1. Start Dev Server
```typescript
// Automatically starts: pnpm dev --filter=examples
// Waits for http://localhost:3000 to be ready
```

### 2. Test Each Example Page

For each of the 6 examples:

- ✅ Navigate to page
- ✅ Wait for load (2 seconds)
- ✅ Take screenshot
- ✅ Check for canvas element
- ✅ Verify no console errors
- ✅ Check WebGPU context initialized

Pages tested:
- `/` — Home page
- `/basic` — Basic gradient
- `/uniforms` — Custom uniforms
- `/render-target` — Render target
- `/ping-pong` — Ping-pong buffer
- `/particles` — GPU particles
- `/fluid` — Fluid simulation

### 3. Test Interactivity

On the fluid page:
- Simulate mouse movement
- Take screenshot after interaction
- Verify visual change (fluid moved)

### 4. Collect Results

The agent reports:
- Number of pages tested
- Screenshots saved
- Console errors found
- Visual verification pass/fail

## Playwright Tools Available

When enabled, the agent has access to:

```typescript
// Navigation
browserNavigate({ url: "http://localhost:3000/basic" })

// Screenshots
browserScreenshot({ filename: "basic.png", fullPage: false })

// Page inspection
browserSnapshot() // Get accessibility tree
browserConsole({ level: "error" }) // Get console messages

// Interaction
browserClick({ element: "button", ref: "e123" })
browserType({ element: "input", ref: "e456", text: "hello" })

// Waiting
browserWait({ time: 2 }) // Wait 2 seconds
browserWait({ text: "Loading..." }) // Wait for text
```

## Example Visual Verification Output

```
🎨 Running visual verification with Playwright MCP...

📡 Starting dev server...

🔍 Testing Home (/)...
  → Navigating to http://localhost:3000/
  → Taking screenshot: example-home.png
  → Checking for canvas element...
  ✅ Home OK

🔍 Testing Basic Gradient (/basic)...
  → Navigating to http://localhost:3000/basic
  → Taking screenshot: example-basic.png
  → Checking for canvas element...
  → Verifying WebGPU context...
  ✅ Basic Gradient OK

🔍 Testing Fluid Simulation (/fluid)...
  → Navigating to http://localhost:3000/fluid
  → Taking screenshot: example-fluid.png
  → Checking for canvas element...
  → Verifying WebGPU context...
  ✅ Fluid Simulation OK

🎮 Testing fluid interactivity...
  ✅ Interactivity OK

━━━ Phase Complete ━━━
Status: verified
Reason: All visual checks passed: pages render, no console errors, interactivity works
```

## Troubleshooting

### "Playwright MCP not available"

**Solution**: Enable in `.env`:
```bash
ENABLE_PLAYWRIGHT_MCP=true
```

### "Cannot connect to MCP server"

**Solutions**:
1. Check MCP server is running
2. Verify `mcp-config.json` is correct
3. Check firewall/network settings
4. Run in Cursor (has built-in MCP)

### Screenshots not saving

**Solution**: Check write permissions in project directory.

### WebGPU errors in browser

**Solutions**:
1. Use Chrome 113+ (best WebGPU support)
2. Enable hardware acceleration
3. Update graphics drivers
4. Check `chrome://gpu` for issues

### Tests timeout

**Solutions**:
1. Increase wait times in verification
2. Check dev server started correctly
3. Verify `http://localhost:3000` is accessible
4. Check for port conflicts

## Skipping Visual Verification

If you can't use Playwright MCP, you can skip visual verification:

```bash
# In ralph/.env
ENABLE_PLAYWRIGHT_MCP=false
```

The agent will still verify:
- TypeScript compilation
- Tests pass
- Build succeeds

But it won't verify actual rendering. You should manually test the examples after.

## Manual Testing (Fallback)

If Playwright MCP is not available:

1. **Run Phase 3** without visual verification
2. **After completion**, manually test:
   ```bash
   # From project root
   cd apps/examples
   pnpm dev
   ```
3. **Visit each example**:
   - http://localhost:3000/basic
   - http://localhost:3000/uniforms
   - http://localhost:3000/render-target
   - http://localhost:3000/ping-pong
   - http://localhost:3000/particles
   - http://localhost:3000/fluid

4. **Verify**:
   - No console errors (F12)
   - Canvas shows rendering
   - Animations work
   - Mouse interaction works (fluid page)

## Benefits of Visual Testing

| Without Playwright MCP | With Playwright MCP |
|------------------------|---------------------|
| ❓ Code compiles | ✅ Code compiles |
| ❓ Builds succeed | ✅ Builds succeed |
| ❌ Unknown if renders | ✅ Verified renders |
| ❌ Unknown if interactive | ✅ Tested interactivity |
| ❌ No screenshots | ✅ Screenshots saved |
| ❌ Manual testing needed | ✅ Fully automated |

**Recommendation**: Always use Playwright MCP for shader libraries!

## Next Steps

1. ✅ Enable `ENABLE_PLAYWRIGHT_MCP=true` in `.env`
2. ✅ Run `pnpm agent` (or `pnpm phase3` for just examples)
3. ✅ Review screenshots in project root
4. ✅ Check verification output for issues

Visual testing ensures your shader library actually works, not just compiles. This is critical for WebGPU projects!
