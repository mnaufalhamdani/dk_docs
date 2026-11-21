/** @type {import('next').NextConfig} */
const nextConfig = {
  // mysql2, awilix, dan pdfkit (pembuat PDF Uji CR) dijalankan native di server, tidak di-bundle
  serverExternalPackages: ['mysql2', 'awilix', 'pdfkit'],

  // Saat development Next.js memblokir aset dev (JS, HMR WebSocket) dari origin selain localhost.
  // Tanpa daftar ini, membuka lewat IP / perangkat lain membuat halaman tidak pernah hydrate:
  // tombol, form, dan mode gelap tidak berfungsi. Berlaku hanya untuk `next dev`.
  // Satu `*` = satu segmen (oktet) hostname. Tambahkan IP/hostname lain di sini bila perlu.
  allowedDevOrigins: ['172.21.32.1', '172.*.*.*', '192.168.*.*', '10.*.*.*', '*.local'],
};

export default nextConfig;
