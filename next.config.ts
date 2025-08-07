import type { NextConfig } from 'next';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.plugins = config.plugins || [];

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              path.resolve(
                __dirname,
                'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
              ),
            ),
            to: path.join(path.resolve(__dirname, 'public')),
          },
        ],
      }),
    );
    return config;
  },
};

export default nextConfig;
