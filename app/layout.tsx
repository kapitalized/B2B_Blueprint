import type { Metadata } from 'next';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
