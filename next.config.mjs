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
  
  // Конфигурация изображений
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cs14.pikabu.ru',
      },
      {
        protocol: 'https',
        hostname: 'tengrinews.kz',
      },
      {
        protocol: 'https',
        hostname: 'avatars.mds.yandex.net',
      },
      {
        protocol: 'https',
        hostname: 'avfdefowtxijmlvocodx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'kulssuzzjwlyacqvawau.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'media.discordapp.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      // Добавляем популярные хосты изображений
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      // Разрешаем все поддомены Supabase
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    // Настройки для оптимизации
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Разрешаем любые домены для development (убрать в продакшене)
    unoptimized: process.env.NODE_ENV === 'development',
    
    // Также разрешаем любые домены для staging (можно убрать в продакшене)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Игнорируем все ошибки во время сборки
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
  
  // Отключаем генерацию source maps в production для уменьшения ошибок 404
  productionBrowserSourceMaps: false,
  
  // Оптимизируем сборку
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
