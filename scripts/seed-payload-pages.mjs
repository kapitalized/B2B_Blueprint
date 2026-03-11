#!/usr/bin/env node
/**
 * Calls the seed API route. Dev server must be running (npm run dev).
 * Usage: node scripts/seed-payload-pages.mjs [baseUrl] [key]
 */
const baseUrl = process.argv[2] || 'http://localhost:3000';
const key = process.argv[3] || process.env.INTERNAL_SERVICE_KEY || 'dev-secret-handshake';
const url = `${baseUrl}/api/seed-payload-pages?key=${encodeURIComponent(key)}`;

fetch(url, { method: 'POST' })
  .then((r) => r.json())
  .then((body) => {
    if (body.error) {
      console.error(body.error);
      process.exit(1);
    }
    console.log('Created:', body.created?.join(', ') || 'none');
    console.log('Skipped (already exist):', body.skipped?.join(', ') || 'none');
    console.log(body.message || 'Done.');
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
