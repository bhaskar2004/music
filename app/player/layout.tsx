import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wavelength Player',
  description: 'Your personal music library — download, organize, and play.',
};

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
