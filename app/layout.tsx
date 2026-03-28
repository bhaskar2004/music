import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wavelength — Music Library',
  description: 'Uber-inspired music player. Paste any URL to download & play.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
