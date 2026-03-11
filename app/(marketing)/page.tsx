import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export default function MarketingPage() {
  return (
    <div className="min-h-[80vh]">
      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Floorplan & materials estimation, simplified
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload floorplans, get accurate room areas and material takeoffs. Built for contractors and estimators.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: BRAND.colors.primary }}
          >
            Open the app
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold border border-border hover:bg-muted transition-colors"
          >
            See features
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t bg-muted/40 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold text-center mb-10">Why {BRAND.name}</h2>
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <h3 className="font-semibold" style={{ color: BRAND.colors.primary }}>Upload & measure</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                Drop PDF or image floorplans; we extract rooms and areas automatically.
              </p>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: BRAND.colors.primary }}>Material takeoffs</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                Get quantities for flooring, paint, trim, and more from your plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: BRAND.colors.primary }}>Export & share</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                Export to spreadsheets or send estimates to your team and clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA + nav */}
      <section className="px-6 py-16 text-center">
        <p className="text-muted-foreground mb-6">
          Ready to estimate faster? Go to the app, or explore the rest of the site.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/dashboard" className="font-medium hover:underline" style={{ color: BRAND.colors.primary }}>
            App (Dashboard)
          </Link>
          <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </div>
      </section>
    </div>
  );
}
