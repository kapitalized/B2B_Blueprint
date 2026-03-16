#!/usr/bin/env node
/**
 * Fix Payload importMap.js if it was generated with old paths.
 * Admin components now live at app/(payload)/admin/_components/ and use
 * relative paths (./_components/...) so the generator does not need patching.
 * This script only runs when the old 'components/admin-payload/' pattern
 * appears (e.g. after reverting config). Run: npm run fix:importmap
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
// Write to both path variants so the file Next.js reads is fixed (Windows can have two path forms).
const importMapPaths = [
  path.join(root, 'app', '(payload)', 'admin', 'importMap.js'),
  path.join(root, 'app') + '/(payload)/admin/importMap.js',
];

let content;
try {
  content = readFileSync(importMapPaths[0], 'utf8');
} catch (e) {
  try {
    content = readFileSync(importMapPaths[1], 'utf8');
  } catch {
    throw e;
  }
}
const before = content;
// Fix: Generator writes ../../../_components/ (wrong). Use ./_components/ relative to importMap.js.
content = content.replace(/from ['"](\.\.\/)+_components\//g, "from './_components/");
if (content.includes("from 'components/admin-payload/")) {
  content = content.replaceAll("from 'components/admin-payload/", "from '@/components/admin-payload/");
}
if (content !== before) {
  for (const p of importMapPaths) {
    try {
      writeFileSync(p, content, 'utf8');
    } catch (_) {}
  }
  console.log('fix-importmap: Corrected import paths in importMap.js.');
}
