import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: `Privacy Policy | ${BRAND.name}`,
  description: `Privacy policy for ${BRAND.name} — how we collect, use, and protect your data.`,
};

const sections = [
  {
    id: 'intro',
    title: 'Introduction',
    content: `Welcome to ${BRAND.name}. We are committed to protecting your data and privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform. By accessing the platform, you agree to these terms.`,
  },
  {
    id: 'data-collection',
    title: 'Information We Collect',
    content: (
      <>
        To provide our services, we collect the following categories of information:
        <ul className="mt-2 list-disc pl-6 space-y-1">
          <li><strong>Registration Data:</strong> Name, work email, and login credentials provided during the registration process.</li>
          <li><strong>User-Uploaded Content:</strong> Documents and data you provide to the platform for analysis.</li>
          <li><strong>Usage Metadata:</strong> Logs of your interactions with the platform to ensure security and performance.</li>
          <li><strong>Publicly Available Data:</strong> The platform may utilize publicly available data to support analysis or provide context to your inputs.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-processing',
    title: 'Data Processing',
    content: (
      <>
        The platform processes your uploaded documents specifically to provide analysis requested by you.
        <div className="mt-4 rounded-md border bg-muted/50 p-4">
          <p className="text-sm"><strong>Note:</strong> We do not use your private uploaded documents to train general models without explicit consent. Data is processed to generate results within your secure workspace.</p>
        </div>
      </>
    ),
  },
  {
    id: 'data-usage',
    title: 'How We Use Data',
    content: (
      <>
        We use your information to:
        <ol className="mt-2 list-decimal pl-6 space-y-1">
          <li>Provide and maintain the features of the platform.</li>
          <li>Ensure secure authenticated access to your account.</li>
          <li>Combine user inputs with public data to deliver information.</li>
          <li>Comply with legal obligations.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Data Sharing',
    content: 'We do not sell your data. We share information only with necessary infrastructure providers (such as hosting and encrypted processing services) required to operate the platform, or as required by law.',
  },
  {
    id: 'retention',
    title: 'Data Retention & Security',
    content: 'We implement standard security measures to protect your data. Your uploaded documents and account data are retained for as long as your account is active or as needed to provide you with the services of the platform.',
  },
  {
    id: 'rights',
    title: 'Your Rights',
    content: 'You have the right to access, export, or request the deletion of your account and any associated documents. Please contact us via the link below if you wish to exercise these rights.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b pb-8 mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          This Privacy Policy describes the agreement between <strong>{BRAND.name}</strong> and <strong>you the User</strong> regarding the collection and use of data on this platform. This policy should be read in conjunction with our{' '}
          <Link href="/terms" className="text-primary underline hover:no-underline">Terms of Use</Link>.
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
        <p className="text-muted-foreground text-sm mb-6">Need to contact us about privacy and data retention?</p>
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
