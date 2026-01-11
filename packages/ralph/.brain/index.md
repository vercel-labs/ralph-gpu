# @ralph/core - Brain Index

Documentation and knowledge base for the autonomous AI agent loop library.

## Overview

`@ralph/core` is a TypeScript library for running autonomous AI agent loops. It implements the "Ralph Wiggum" pattern: a simple loop that feeds tasks to an AI model with tools until completion.

## Contents

- [brain-instructions.md](./brain-instructions.md) - **Start here** - How to use this .brain folder
- [architecture.md](./architecture.md) - High-level design and component overview
- [conventions.md](./conventions.md) - Code style and patterns used
- [decisions/](./decisions/) - Key architectural decisions
- [progress.md](./progress.md) - Implementation progress tracking
- [testing.md](./testing.md) - Test suite documentation

## Quick Reference

### Main Entry Point

- `LoopAgent` class in `src/agent.ts`

### Key Dependencies

- `ai` ^6.0.0 (Vercel AI SDK)
- `bash-tool` ^1.0.0
- `playwright` ^1.48.0
- `zod` ^3.23.0

### Package Status

✅ Implementation complete - builds, type-checks, and **182 tests passing**
