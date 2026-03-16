import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { getB2BSoftwareJsonLd } from '@/lib/seo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = getB2BSoftwareJsonLd();

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center" style={{ color: BRAND.colors.primary }}>
          <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-base text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link href="/features" className="text-base text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="text-base text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
          <Link href="/about" className="text-base text-muted-foreground hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="text-base text-muted-foreground hover:text-foreground">
            Contact
          </Link>
          <Link href="/privacy" className="text-base text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="text-base text-muted-foreground hover:text-foreground">
            Terms
          </Link>
          <Link href="/setup" className="text-base text-muted-foreground hover:text-foreground">
            Setup
          </Link>
          <Link href="/admin" className="text-base text-muted-foreground hover:text-foreground">
            Admin
          </Link>
          <Link href="/login" className="text-base font-medium text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="text-base font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90"
            style={{ backgroundColor: BRAND.colors.primary }}
          >
            Get started
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <span className="text-base text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}. {BRAND.slogan}
          </span>
          <nav className="flex gap-6 text-base text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/features" className="hover:text-foreground">Features</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
            <Link href="/setup" className="hover:text-foreground">Setup</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
