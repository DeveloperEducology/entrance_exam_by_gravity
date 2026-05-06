import "./globals.css";
import 'katex/dist/katex.min.css';
import { Baloo_2, Nunito } from 'next/font/google';
import { getSiteUrl } from '@/lib/seo';
import ConnectivityBanner from '@/components/system/ConnectivityBanner';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
});

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'WEXLS Practice App',
    template: '%s | WEXLS Practice App',
  },
  description: 'Adaptive practice platform for school skills with interactive question types and instant feedback.',
  keywords: [
    'adaptive learning',
    'practice questions',
    'math practice',
    'english practice',
    'education app',
    'WEXLS style practice',
  ],
  authors: [{ name: "WEXLS Learning" }],
  creator: "WEXLS Learning",
  publisher: "WEXLS Learning",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "WEXLS Practice App",
    description: "Adaptive skill practice with interactive question types for kids.",
    url: siteUrl,
    siteName: 'WEXLS Practice App',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WEXLS Practice App',
    description: 'Adaptive skill practice with interactive question types.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/wexls-favicon.svg',
    shortcut: '/wexls-favicon.svg',
    apple: '/wexls-favicon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WEXLS',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/wexls-favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/wexls-favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/wexls-favicon.svg" />
        <meta name="theme-color" content="#004e92" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WEXLS" />
      </head>
      <body className={`${nunito.variable} ${baloo.variable}`}>
        <ConnectivityBanner />
        {children}
      </body>
    </html>
  );
}
