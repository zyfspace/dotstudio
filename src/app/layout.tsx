import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Inter_Tight } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DotStudio — Projects, Payments & Documents',
  description: 'Clean dashboard management for projects, payments, invoices, quotations, and clients.',
  // iOS has no Install prompt; Add to Home Screen uses these
  appleWebApp: {
    capable: true,
    title: 'DotStudio',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${GeistSans.variable} ${interTight.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
