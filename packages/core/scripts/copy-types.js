#!/usr/bin/env node

/**
 * Copy Distribution Files to Docs
 * 
 * Copies the entire dist/ directory from packages/core to apps/docs/public/dist
 * so both the Monaco editor and preview iframe can access types and bundles.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIST_DIR = path.join(__dirname, '..', 'dist');
const TARGET_DIST_DIR = path.join(__dirname, '..', '..', '..', 'apps', 'docs', 'public', 'dist');

function copyDirectory(src, dest) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all files and directories
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyDist() {
  // Check if source dist directory exists
  if (!fs.existsSync(SOURCE_DIST_DIR)) {
    console.error('⚠ dist/ directory not found. Run build first.');
    process.exit(1);
  }

  // Remove old dist directory if it exists
  if (fs.existsSync(TARGET_DIST_DIR)) {
    fs.rmSync(TARGET_DIST_DIR, { recursive: true, force: true });
  }

  // Copy entire dist directory
  copyDirectory(SOURCE_DIST_DIR, TARGET_DIST_DIR);

  // Count files
  const allFiles = fs.readdirSync(TARGET_DIST_DIR);
  const typeFiles = allFiles.filter((f) => f.endsWith('.d.ts'));
  const mjsFiles = allFiles.filter((f) => f.endsWith('.mjs'));

  console.log(`✓ Copied dist/ to apps/docs/public/dist/`);
  console.log(`  - ${typeFiles.length} type definition files`);
  console.log(`  - ${mjsFiles.length} module bundle(s)`);
  console.log(`  - ${allFiles.length} total files`);
}

copyDist();
