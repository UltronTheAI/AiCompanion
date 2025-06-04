/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Server Components
  reactStrictMode: true,
  
  // Configure image domains if you're loading images from external sources
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Dynamically set the API URL based on environment
  env: {
    // This will be overridden by Vercel environment variables in production
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  },
  
  // Optional: Configure for serverless deployment
  output: 'standalone',
};

export default nextConfig;
