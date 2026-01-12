#!/usr/bin/env node

/**
 * Bundle Size Reporter
 * 
 * Outputs the bundle size after each build and optionally updates the README.
 */

const fs = require('fs');
const path = require('path');
const { gzipSync, brotliCompressSync } = require('zlib');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const README_PATH = path.join(__dirname, '..', 'README.md');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileSizes(filePath) {
  const content = fs.readFileSync(filePath);
  const raw = content.length;
  const gzip = gzipSync(content, { level: 9 }).length;
  const brotli = brotliCompressSync(content).length;
  return { raw, gzip, brotli };
}

function printTable(data) {
  const colWidths = {
    file: Math.max(10, ...data.map(d => d.file.length)) + 2,
    raw: 12,
    gzip: 12,
    brotli: 12,
  };
  
  const separator = '-'.repeat(colWidths.file + colWidths.raw + colWidths.gzip + colWidths.brotli + 7);
  
  console.log(`\n${colors.bold}${colors.cyan}📦 Bundle Size Report${colors.reset}\n`);
  console.log(separator);
  console.log(
    `${colors.bold}${'File'.padEnd(colWidths.file)}${colors.reset}` +
    `${colors.dim}|${colors.reset} ` +
    `${colors.bold}${'Raw'.padStart(colWidths.raw - 2)}${colors.reset}` +
    `${colors.dim}|${colors.reset} ` +
    `${colors.bold}${'Gzip'.padStart(colWidths.gzip - 2)}${colors.reset}` +
    `${colors.dim}|${colors.reset} ` +
    `${colors.bold}${'Brotli'.padStart(colWidths.brotli - 2)}${colors.reset}`
  );
  console.log(separator);
  
  for (const row of data) {
    console.log(
      `${colors.yellow}${row.file.padEnd(colWidths.file)}${colors.reset}` +
      `${colors.dim}|${colors.reset} ` +
      `${colors.blue}${formatBytes(row.raw).padStart(colWidths.raw - 2)}${colors.reset}` +
      `${colors.dim}|${colors.reset} ` +
      `${colors.green}${formatBytes(row.gzip).padStart(colWidths.gzip - 2)}${colors.reset}` +
      `${colors.dim}|${colors.reset} ` +
      `${colors.magenta}${formatBytes(row.brotli).padStart(colWidths.brotli - 2)}${colors.reset}`
    );
  }
  
  console.log(separator);
}

function updateReadme(sizes) {
  if (!fs.existsSync(README_PATH)) {
    console.log(`${colors.yellow}⚠ README.md not found, skipping update${colors.reset}`);
    return;
  }
  
  let readme = fs.readFileSync(README_PATH, 'utf-8');
  
  // Find the ESM bundle size (main bundle for reporting)
  const esmSize = sizes.find(s => s.file === 'index.mjs');
  if (!esmSize) return;
  
  const gzipKb = (esmSize.gzip / 1024).toFixed(1);
  const brotliKb = (esmSize.brotli / 1024).toFixed(1);
  
  // Update the badges at the top
  readme = readme.replace(
    /gzip-[\d.]+kB-blue/,
    `gzip-${gzipKb}kB-blue`
  );
  readme = readme.replace(
    /brotli-[\d.]+kB-purple/,
    `brotli-${brotliKb}kB-purple`
  );
  readme = readme.replace(
    /<strong>~[\d.]+kB gzipped<\/strong>/,
    `<strong>~${Math.round(esmSize.gzip / 1024)}kB gzipped</strong>`
  );
  
  // Create the bundle size section
  const bundleSizeSection = `## Bundle Size

| Format | Raw | Gzip | Brotli |
|--------|-----|------|--------|
${sizes.map(s => `| ${s.file} | ${formatBytes(s.raw)} | ${formatBytes(s.gzip)} | ${formatBytes(s.brotli)} |`).join('\n')}

> 📦 **~${gzipKb} kB** gzipped (ESM)`;

  // Check if bundle size section already exists
  const bundleSizeRegex = /## Bundle Size[\s\S]*?(?=\n## |$)/;
  
  if (bundleSizeRegex.test(readme)) {
    // Update existing section
    readme = readme.replace(bundleSizeRegex, bundleSizeSection + '\n');
  } else {
    // Insert before "## Browser Support" or at the end before "## License"
    const browserSupportIndex = readme.indexOf('## Browser Support');
    const licenseIndex = readme.indexOf('## License');
    
    if (browserSupportIndex !== -1) {
      readme = readme.slice(0, browserSupportIndex) + bundleSizeSection + '\n\n' + readme.slice(browserSupportIndex);
    } else if (licenseIndex !== -1) {
      readme = readme.slice(0, licenseIndex) + bundleSizeSection + '\n\n' + readme.slice(licenseIndex);
    } else {
      readme += '\n\n' + bundleSizeSection;
    }
  }
  
  fs.writeFileSync(README_PATH, readme);
  console.log(`\n${colors.green}✓ Updated README.md with bundle sizes${colors.reset}`);
}

function main() {
  const updateReadmeFlag = process.argv.includes('--update-readme');
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`${colors.bold}${colors.yellow}⚠ dist/ directory not found. Run build first.${colors.reset}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(DIST_DIR).filter(f => 
    f.endsWith('.js') || f.endsWith('.mjs')
  );
  
  if (files.length === 0) {
    console.error(`${colors.bold}${colors.yellow}⚠ No bundle files found in dist/${colors.reset}`);
    process.exit(1);
  }
  
  const sizes = files.map(file => ({
    file,
    ...getFileSizes(path.join(DIST_DIR, file))
  }));
  
  printTable(sizes);
  
  // Calculate totals for both bundles
  const totalRaw = sizes.reduce((sum, s) => sum + s.raw, 0);
  const totalGzip = sizes.reduce((sum, s) => sum + s.gzip, 0);
  
  console.log(`\n${colors.dim}Total (all formats): ${formatBytes(totalRaw)} raw, ${formatBytes(totalGzip)} gzip${colors.reset}`);
  
  // Output machine-readable format for CI
  if (process.env.CI || process.argv.includes('--json')) {
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      bundles: sizes.reduce((acc, s) => {
        acc[s.file] = { raw: s.raw, gzip: s.gzip, brotli: s.brotli };
        return acc;
      }, {}),
    };
    
    const jsonPath = path.join(DIST_DIR, 'bundle-size.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`\n${colors.dim}JSON output written to dist/bundle-size.json${colors.reset}`);
  }
  
  if (updateReadmeFlag) {
    updateReadme(sizes);
  }
}

main();
