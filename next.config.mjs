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
      }
    ],
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
};

export default nextConfig;
