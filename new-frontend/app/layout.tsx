import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Topbar } from '@/components/Topbar';
import { TweaksPanel } from '@/components/TweaksPanel';

export const metadata: Metadata = {
  title: "PitchPulse · World Cup '26",
  description: "Real-time map-based intelligence dashboard for the FIFA World Cup 2026.",
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
            {children}
            <TweaksPanel />
          </div>
        </Providers>
      </body>
    </html>
  );
}
