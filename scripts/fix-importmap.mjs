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
const importMapPath = path.join(__dirname, '..', 'app', '(payload)', 'admin', 'importMap.js');

let content = readFileSync(importMapPath, 'utf8');
let changed = false;

// Fix 1: Generator sometimes writes ../../../_components/ or similar (wrong). Should be ./_components/
const before = content;
content = content.replace(/from '\.\.\/.*?_components\//g, "from './_components/");
if (content !== before) changed = true;
// Fix 2: Legacy pattern from before move to _components
if (content.includes("from 'components/admin-payload/")) {
  content = content.replaceAll("from 'components/admin-payload/", "from '@/components/admin-payload/");
  changed = true;
}

if (changed) {
  writeFileSync(importMapPath, content, 'utf8');
  console.log('fix-importmap: Corrected import paths in importMap.js.');
}
