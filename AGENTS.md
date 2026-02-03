# Setup

This repository uses pnpm and turborepo.

# Documentation Guide for AI Agents

When making changes to ralph-gpu, update documentation in this order:

## 1. Update Core README
**File**: `packages/core/README.md`
- Add API changes, new options, and usage examples

## 2. Update Cursor Rules (Source of Truth)
**File**: `.cursor/rules/ralph-gpu.mdc`
- This is the source that generates SKILLS
- Add code examples with proper section headers and language tags

## 3. Regenerate SKILLS
**CRITICAL**: After editing cursor rules, run:
```bash
npx tsx scripts/generate-skills.ts
```
- Never manually edit files in `SKILLS/` - they're auto-generated

## 4. Update Docs App
**File**: `apps/docs/app/(nav)/api/page.tsx` (or relevant page)
- Add to interface examples and API reference

## 5. Add Experiments (for visual features)
**Files**:
- `apps/experiments/lib/examples.ts` - Add to examples array
- `apps/experiments/app/<feature>/page.tsx` - Create interactive demo

## 6. Add Tests
- Browser tests: `packages/core/tests/browser/<feature>.browser.test.ts`
- Unit tests: `packages/core/tests/<feature>.test.ts`

## Quick Reference

**Documentation Sources (in order of authority)**:
1. `packages/core/README.md` - Core package docs
2. `.cursor/rules/ralph-gpu.mdc` - Cursor AI rules (source of truth for SKILLS)
3. `SKILLS/ralph-gpu/*` - Auto-generated (never edit manually)
4. `apps/docs/*` - User-facing docs site
5. `apps/experiments/*` - Interactive examples

**Common Mistakes**:
- ❌ Editing SKILLS files manually (they're auto-generated)
- ❌ Forgetting to run `npx tsx scripts/generate-skills.ts`
- ❌ Updating only one documentation source

---
*Last Updated: 2026-02-03*
