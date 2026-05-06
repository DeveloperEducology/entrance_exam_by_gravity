import { fileURLToPath } from 'node:url';
import path from 'node:path';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const r2Url = process.env.VITE_R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
let r2Host = '';
try {
  r2Host = r2Url ? new URL(r2Url).hostname : '';
} catch {
  r2Host = '';
}

const remotePatterns = [
  { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
  { protocol: 'https', hostname: 'plus.unsplash.com' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'png.pngtree.com' },
  { protocol: 'https', hostname: 'pub-6d655d3564544704a2d99beb0760355e.r2.dev' },
];

if (r2Host && !remotePatterns.some((pattern) => pattern.hostname === r2Host)) {
  remotePatterns.push({ protocol: 'https', hostname: r2Host });
}

const nextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    remotePatterns,
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: '/api/express/:path*',
      }
    ];
  },
};

export default withPWA(nextConfig);
