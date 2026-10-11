import type { MetadataRoute } from 'next';

// Installed app (Add to Home screen / Install) always opens on the Overview,
// whichever page was open when it was installed or last closed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'DotStudio',
    short_name: 'DotStudio',
    description: 'Clean dashboard management for projects, payments, invoices, quotations, and clients.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
