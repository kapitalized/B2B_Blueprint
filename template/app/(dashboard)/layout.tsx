import Link from 'next/link';
import { headers } from 'next/headers';
import { BRAND } from '@/lib/brand';
import { auth, isNeonAuthConfigured } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/supabase/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string | null } | null = null;

  if (isNeonAuthConfigured() && auth) {
    try {
      const session = await (auth as { api?: { getSession: (opts: { headers: Headers }) => Promise<{ user?: { email?: string } }> } }).api?.getSession?.({ headers: await headers() });
      user = session?.user ? { email: session.user.email } : null;
    } catch {
      user = null;
    }
  }

  if (!user) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      user = data.user ? { email: data.user.email } : null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-card">
        <Link href="/dashboard" className="font-bold" style={{ color: BRAND.colors.primary }}>
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard/ai/chat" className="text-sm text-muted-foreground hover:text-foreground">
            AI Chat
          </Link>
          <Link href="/dashboard/ai/reports" className="text-sm text-muted-foreground hover:text-foreground">
            AI Reports
          </Link>
          <Link href="/dashboard/ai/documents" className="text-sm text-muted-foreground hover:text-foreground">
            Documents
          </Link>
          <Link href="/dashboard/team" className="text-sm text-muted-foreground hover:text-foreground">
            Team
          </Link>
          <Link href="/dashboard/billing" className="text-sm text-muted-foreground hover:text-foreground">
            Billing
          </Link>
          {user ? (
            <span className="text-sm text-muted-foreground">
              {user.email}
              {isNeonAuthConfigured() ? (
                <a href="/api/auth/sign-out" className="ml-2 text-sm text-muted-foreground hover:text-foreground underline">
                  Sign out
                </a>
              ) : (
                <form action={signOut} className="inline ml-2">
                  <button type="submit" className="text-sm text-muted-foreground hover:text-foreground underline">
                    Sign out
                  </button>
                </form>
              )}
            </span>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        System status · {BRAND.name}
      </footer>
    </div>
  );
}
