#!/usr/bin/env node
/**
 * Fix Payload importMap.js so Next.js can resolve admin-payload components.
 * Payload generate:importmap writes 'components/admin-payload/...' which Next
 * can't resolve; this script adds the @/ prefix to those import paths.
 *
 * Run after: npx payload generate:importmap
 * Or use: npm run payload:importmap
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importMapPath = path.join(__dirname, '..', 'app', '(payload)', 'admin', 'importMap.js');

const content = readFileSync(importMapPath, 'utf8');
const bad = "from 'components/admin-payload/";
const good = "from '@/components/admin-payload/";

if (!content.includes(bad)) {
  process.exit(0);
}

const updated = content.replaceAll(bad, good);
writeFileSync(importMapPath, updated, 'utf8');
console.log('fix-importmap: Fixed admin importMap.js (added @/ to admin-payload imports).');
