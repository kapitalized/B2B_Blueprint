import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: `Terms of Use | ${BRAND.name}`,
  description: `Terms of service for using ${BRAND.name} — acceptable use and legal terms.`,
};

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: `By creating an account or using the ${BRAND.name} platform, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.`,
  },
  {
    id: 'accounts',
    title: 'Account Tiers & Limits',
    content: (
      <>
        We offer different levels of access to the platform:
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><strong>Free Accounts:</strong> Provided at no cost but subject to strict usage limits, including restricted document analysis volume and lower priority processing.</li>
          <li><strong>Paid Plans:</strong> Subscriptions that provide higher usage limits, advanced features, and faster processing speeds.</li>
        </ul>
        Users must provide accurate information during registration and are responsible for maintaining the security of their login credentials.
      </>
    ),
  },
  {
    id: 'ai-accuracy',
    title: 'AI Output & Accuracy',
    content: (
      <>
        The platform utilizes artificial intelligence to generate analysis and content.
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Important Notice on Accuracy:</p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            AI-generated content can contain inaccuracies, errors, or &quot;hallucinations.&quot; You the User acknowledge that {BRAND.name} does not guarantee the accuracy, completeness, or reliability of any output. <strong>It is your sole responsibility to check, verify, and validate all AI-generated results</strong> before relying on them for business, legal, or professional purposes.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Service Availability & Outages',
    content: (
      <>
        We strive to provide continuous access to the platform; however:
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><strong>Hosting Dependencies:</strong> The platform relies on third-party infrastructure and hosting providers (e.g., AWS, Google Cloud, or Azure).</li>
          <li><strong>No Uptime Guarantee:</strong> {BRAND.name} does not guarantee 100% uptime. Service may be interrupted by maintenance, server failures, or outages caused by our hosting providers or global internet infrastructure.</li>
          <li><strong>Limitation:</strong> We are not liable for any losses, data corruption, or business interruptions resulting from such third-party outages or technical failures beyond our direct control.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'fair-use',
    title: 'Fair Use & Token Policy',
    content: 'To ensure platform stability and equitable access for all users, we implement a Fair Use Policy. Excessive usage—defined as token consumption or document uploads that significantly exceed the average for your tier—may result in temporary throttling or suspension of your account to protect platform resources.',
  },
  {
    id: 'subscriptions',
    title: 'Billing & Cancellation',
    content: (
      <>
        For users on paid plans:
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><strong>Billing:</strong> Fees are billed in advance on a recurring basis.</li>
          <li><strong>Cancellation:</strong> You may cancel your subscription at any time.</li>
          <li><strong>Effective Date:</strong> Upon cancellation, your access to paid features will remain active until the end of your current billing cycle. No prorated refunds are provided.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: `The platform is provided "as is." In no event shall ${BRAND.name} or its suppliers be liable for any damages (including loss of data or profit) arising out of the use or inability to use the platform, even if ${BRAND.name} has been notified of the possibility of such damage.`,
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b pb-8 mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="mt-4 text-muted-foreground">
          This agreement is between <strong>{BRAND.name}</strong> and <strong>you the User</strong>. By accessing this platform, you agree to comply with these terms. Please also review our{' '}
          <Link href="/privacy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-10 text-muted-foreground">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <div className="mt-2 leading-relaxed">
              {typeof section.content === 'string' ? section.content : section.content}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-20 pt-10 border-t text-center">
        <p className="text-muted-foreground text-sm mb-6">Need to contact us about these terms or your account?</p>
        <Link
          href="/contact"
          className="inline-block rounded-md border bg-muted px-6 py-3 font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
          Contact us
        </Link>
      </footer>
    </div>
  );
}
