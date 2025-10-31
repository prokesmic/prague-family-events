import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.goout.net',
      },
      {
        protocol: 'https',
        hostname: '**.praguest.com',
      },
      {
        protocol: 'https',
        hostname: '**.ententyky.cz',
      },
      {
        protocol: 'https',
        hostname: '**.skvelecesko.cz',
      },
      {
        protocol: 'https',
        hostname: '**.kudyznudy.cz',
      },
    ],
  },
};

export default nextConfig;
