'use client';

/**
 * Wrapper so we can add logic later (e.g. set sidebar expanded via preferences).
 * Nav visibility and expanded-by-default are enforced via custom.scss.
 */
import React from 'react';

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
