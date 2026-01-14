# Project Overview

This project aims to emit events from core classes within the `ralph-gpu` library. The event system foundation (events.ts, event-emitter.ts, context.ts) has been established in Phase 1. This phase (Phase 2) focuses on integrating event emission into `Pass`, `Material`, `ComputeShader`, `StorageBuffer`, and `RenderTarget` classes, as well as adding target events to `GPUContext`.
