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
  
  // Минимальная конфигурация изображений
  images: {
    unoptimized: true,
  },
  
  // Отключаем генерацию source maps в production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
