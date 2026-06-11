import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Topbar } from '@/components/Topbar';

export const metadata: Metadata = {
  title: "PitchPulse · World Cup '26",
  description: "Real-time map-based intelligence dashboard for the FIFA World Cup 2026.",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '1024x1024', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

const fontHref =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={fontHref} />
      </head>
      <body>
        <Providers>
          <div className="app paper-grain">
            <Topbar />
            <main className="app-main">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
