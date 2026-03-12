'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

interface UserMenuProps {
  userEmail?: string | null;
  useNeonAuth: boolean;
  /** Server action for sign out when using Supabase */
  signOutAction?: () => Promise<void>;
}

export function UserMenu({ userEmail, useNeonAuth, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {userEmail?.[0]?.toUpperCase() ?? '?'}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border bg-card py-1 shadow-lg"
          role="menu"
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{userEmail ?? 'User'}</p>
          </div>
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/dashboard/billing"
            className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Subscription
          </Link>
          <div className="border-t pt-1">
            {useNeonAuth ? (
              <a
                href="/api/auth/sign-out"
                className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Log out
              </a>
            ) : signOutAction ? (
              <form action={signOutAction} className="block">
                <button
                  type="submit"
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  Log out
                </button>
              </form>
            ) : (
              <a
                href="/api/auth/sign-out"
                className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                role="menuitem"
              >
                Log out
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
