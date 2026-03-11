/**
 * One-time seed: create default marketing pages (about, features, pricing, contact)
 * in the Payload Pages collection.
 *
 * Easiest: with the dev server running (npm run dev), run:
 *   npm run seed:payload
 * That calls the API route which seeds the pages.
 *
 * Or call the API directly:
 *   curl -X POST "http://localhost:3000/api/seed-payload-pages?key=dev-secret-handshake"
 * (Use INTERNAL_SERVICE_KEY from .env.local if you set it.)
 *
 * Then refresh the admin Pages list to see About, Features, Pricing, Contact.
 */

export {};
