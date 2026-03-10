import config from '@payload-config';
import '@payloadcms/next/css';
import type { ServerFunctionClient } from 'payload';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import React from 'react';

import { importMap } from './admin/importMap.js';
import './custom.scss';

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

export default async function PayloadLayout({ children }: Args) {
  if (!config) {
    return (
      <html lang="en">
        <body style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Payload config failed to load</h1>
          <p>Check that payload.config.ts exports a valid config and env (e.g. DATABASE_URI) is set.</p>
        </body>
      </html>
    );
  }
  if (!importMap || typeof serverFunction !== 'function') {
    return (
      <html lang="en">
        <body style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Admin setup error</h1>
          <p>importMap or serverFunction is missing. Check app/(payload)/layout.tsx and admin/importMap.js.</p>
        </body>
      </html>
    );
  }
  const configPromise = typeof config.then === 'function' ? config : Promise.resolve(config);
  try {
    const layout = await RootLayout({
      children,
      config: configPromise,
      importMap,
      serverFunction,
    });
    if (layout == null) {
      return (
        <html lang="en">
          <body style={{ padding: 24, fontFamily: 'sans-serif' }}>
            <h1>Admin layout error</h1>
            <p>RootLayout returned nothing. Check server logs for Payload/DB errors.</p>
          </body>
        </html>
      );
    }
    return layout;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[PayloadLayout]', message, stack);
    return (
      <html lang="en">
        <body style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Admin error</h1>
          <p>{message}</p>
          <pre style={{ marginTop: 16, fontSize: 12, overflow: 'auto' }}>{stack}</pre>
        </body>
      </html>
    );
  }
}
