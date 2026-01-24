# PRD: Generate Cursor Skills for ralph-gpu

## Overview

Create a script that automatically generates Cursor Agent Skills from the ralph-gpu library documentation. The script will parse the existing `.cursor/rules/ralph-gpu.mdc` file and create a structured `SKILLS/ralph-gpu/` folder containing:

1. **Main skill (`SKILL.md`)**: Comprehensive usage guide, complete API specification, and documentation
2. **Example files**: Extracted code examples organized by topic (initialization, passes, rendering, particles, compute, shaders, debugging)

This approach separates the main documentation/API reference from concrete examples, enabling progressive disclosure and easier maintenance.

## Objectives

1. **Generate main skill** with complete usage documentation and API specification
2. **Extract and organize examples** from documentation into topic-specific files
3. **Follow Cursor skill conventions** (SKILL.md format, proper metadata, progressive disclosure)
4. **Enable discoverability** through proper description and trigger terms
5. **Maintain separation** between conceptual documentation and concrete code examples

## Requirements

### Input
- Source: `.cursor/rules/ralph-gpu.mdc` (existing comprehensive guide)
- Reference: Cursor skill format from `~/.cursor/skills-cursor/create-skill/SKILL.md`
- Documentation: https://skills.sh/docs (for understanding skill ecosystem)

### Output Structure

Generate a `SKILLS/` folder at the project root with the following structure:

```
SKILLS/
├── ralph-gpu/
│   ├── SKILL.md              # Main skill: Usage guide, documentation, API specification
│   ├── examples-initialization.md
│   ├── examples-passes.md
│   ├── examples-rendering.md
│   ├── examples-particles.md
│   ├── examples-compute.md
│   ├── examples-shaders.md
│   └── examples-debugging.md
```

**Main Skill (`SKILL.md`)**:
- Core usage patterns and concepts
- Complete API reference and specification
- Installation and setup instructions
- Best practices and common patterns
- Links to example files for concrete implementations

**Example Files**:
- Extract all code examples from the documentation
- Organize by topic (initialization, passes, rendering, particles, compute, shaders, debugging)
- Each example file contains working code snippets with context
- Examples are referenced from the main SKILL.md for progressive disclosure

### Skill Format Requirements

Each `SKILL.md` must include:

1. **YAML Frontmatter**:
   ```yaml
   ---
   name: skill-name
   description: Specific, third-person description with trigger terms
   ---
   ```

2. **Content Structure**:
   - Concise instructions (< 500 lines for SKILL.md)
   - Progressive disclosure (link to reference.md for details)
   - Concrete examples
   - Clear "when to use" guidance

3. **Description Best Practices**:
   - Written in third person
   - Includes WHAT (capabilities) and WHEN (trigger scenarios)
   - Contains key terms for discoverability

### Technical Specifications

- **Language**: TypeScript/Node.js
- **Dependencies**: 
  - Parse markdown (consider `gray-matter` for frontmatter, `remark` for markdown parsing)
  - File system operations (Node.js `fs`)
- **Output**: Generate files in `SKILLS/` directory
- **Error Handling**: Validate markdown structure, handle missing sections gracefully

## Implementation Approach

### Phase 1: Content Analysis
1. Parse `.cursor/rules/ralph-gpu.mdc`
2. Identify and separate:
   - **Documentation content**: Concepts, API specs, usage patterns, best practices
   - **Code examples**: All code blocks (TypeScript/TSX, WGSL) organized by topic
3. Categorize examples by topic:
   - Initialization
   - Passes (fullscreen shaders)
   - Rendering (targets, ping-pong, MRT)
   - Particles
   - Compute shaders
   - WGSL shaders
   - Debugging/profiling

### Phase 2: Main Skill Generation
1. Create `SKILL.md` with:
   - YAML frontmatter (name: `ralph-gpu`, description with trigger terms)
   - Core concepts and installation
   - Complete API specification
   - Usage patterns and best practices
   - Links to example files for concrete implementations
   - Keep under 500 lines, use progressive disclosure

### Phase 3: Example Files Generation
1. Extract all code examples from documentation
2. Group examples by topic into separate markdown files
3. Each example file includes:
   - Descriptive headers for each example
   - Complete, runnable code snippets
   - Brief context/explanation
   - Cross-references to relevant API docs in SKILL.md

### Phase 4: Validation
1. Verify SKILL.md is under 500 lines
2. Check description includes trigger terms (ralph-gpu, WebGPU, shaders, etc.)
3. Ensure all examples are extracted and categorized correctly
4. Validate markdown syntax and code block formatting
5. Verify links between SKILL.md and example files work correctly
6. Ensure consistent terminology throughout

## Success Criteria

- [x] Script successfully parses `ralph-gpu.mdc`
- [x] Generates main `SKILL.md` with:
  - [x] Proper YAML frontmatter with descriptive name and trigger terms
  - [x] Complete API specification
  - [x] Usage documentation and best practices
  - [x] Under 500 lines (using progressive disclosure) - **216 lines**
- [x] Generates 7 example files covering all topics:
  - [x] `examples-initialization.md` - **3 examples**
  - [x] `examples-passes.md` - **2 examples**
  - [x] `examples-rendering.md` - **5 examples**
  - [x] `examples-particles.md` - **11 examples**
  - [x] `examples-compute.md` - **3 examples**
  - [x] `examples-shaders.md` - **4 examples**
  - [x] `examples-debugging.md` - **4 examples**
- [x] All code examples from source documentation are extracted and categorized
- [x] Example files contain complete, runnable code snippets with context
- [x] Main skill links to example files appropriately
- [x] Follows Cursor skill conventions
- [x] Content is concise and actionable
- [x] Skills are discoverable via description keywords

## Implementation Summary

**Date**: 2026-01-23

Successfully implemented a TypeScript script (`scripts/generate-skills.ts`) that:
1. Parses `.cursor/rules/ralph-gpu.mdc` documentation
2. Extracts and categorizes code examples by topic
3. Generates a main SKILL.md (216 lines) with complete API reference
4. Creates 7 example files with 32 total code examples
5. Follows Cursor skill conventions with proper YAML frontmatter

All success criteria have been met. The generated skills are located in `SKILLS/ralph-gpu/`.

## Future Enhancements

- Auto-update skills when documentation changes
- Generate examples from codebase
- Create skill index/README
- Validate against Cursor skill schema

## References

- Cursor Skills Documentation: https://skills.sh/docs
- Existing skill example: `~/.cursor/skills-cursor/create-skill/SKILL.md`
- Source documentation: `.cursor/rules/ralph-gpu.mdc`
