import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // 已删除 ignoreBuildErrors / ignoreDuringBuilds，构建保持严格门禁
  // Next 15 的 allowedDevOrigins 是顶层配置，不属于 experimental
  allowedDevOrigins: [
    'http://192.168.31.218:3000',
    'http://192.168.31.*:3000',
  ],
  webpack: (config) => {
    // 忽略bullmq的动态导入警告
    config.ignoreWarnings = [
      {
        module: /bullmq\/dist\/esm\/classes\/child-processor\.js/,
        message: /Critical dependency: the request of a dependency is an expression/
      }
    ];
    return config;
  }
};

export default withNextIntl(nextConfig);
