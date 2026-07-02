import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoShorts Publisher',
  description: 'Bulk upload and schedule short-form videos to multiple platforms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
