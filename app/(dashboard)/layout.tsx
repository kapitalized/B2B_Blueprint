import Link from 'next/link';
import { headers } from 'next/headers';
import { BRAND } from '@/lib/brand';
import { isNeonAuthConfigured } from '@/lib/auth/server';
import { getSessionForLayout } from '@/lib/auth/get-session-for-layout';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/supabase/actions';
import { UserMenu } from '@/components/dashboard/UserMenu';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string | null } | null = null;

  if (isNeonAuthConfigured()) {
    try {
      // Pass headers so session is resolved from request cookies (required for correct session in Node)
      const session = await getSessionForLayout(await headers());
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
        <Link href="/dashboard" className="flex items-center" style={{ color: BRAND.colors.primary }}>
          <img src={BRAND.logo} alt={BRAND.name} className="h-7 w-auto" />
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/dashboard/organisation" className="text-sm text-muted-foreground hover:text-foreground">
            Organisation
          </Link>
          <Link href="/dashboard/team" className="text-sm text-muted-foreground hover:text-foreground">
            Team
          </Link>
          <Link href="/dashboard/billing" className="text-sm text-muted-foreground hover:text-foreground">
            Billing
          </Link>
          {user ? (
            <UserMenu
              userEmail={user.email}
              useNeonAuth={isNeonAuthConfigured()}
              signOutAction={isNeonAuthConfigured() ? undefined : signOut}
            />
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
