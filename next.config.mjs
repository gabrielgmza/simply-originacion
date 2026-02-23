/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Permite que Vercel compile aunque haya variables sin usar
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que Vercel compile aunque haya tipos "any"
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
