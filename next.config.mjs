/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript настройки для production
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint настройки для production
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Отключаем функции которые могут вызывать проблемы
  reactStrictMode: false,
  
  // Игнорируем все ошибки во время сборки
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
