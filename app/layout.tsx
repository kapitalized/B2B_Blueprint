import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.slogan,
  icons: { icon: '/favicon.ico', shortcut: '/favicon.ico', apple: BRAND.logo },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
