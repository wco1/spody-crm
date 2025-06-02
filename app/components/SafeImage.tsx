'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function SafeImage({ 
  src, 
  alt, 
  className, 
  fill, 
  sizes, 
  width, 
  height, 
  priority = false 
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState(src || '/default-avatar.svg');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Обновляем imageSrc когда меняется src
  useEffect(() => {
    if (src && src !== imageSrc && !hasError) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  const handleError = (error: any) => {
    if (!hasError) {
      setHasError(true);
      setIsLoading(false);
      setImageSrc('/default-avatar.svg');
      
      // Детальное логирование ошибки
      console.warn(`[SafeImage] Ошибка загрузки изображения:`, {
        originalSrc: src,
        currentSrc: imageSrc,
        error: error,
        alt: alt
      });
      
      // Дополнительная диагностика
      if (src) {
        try {
          const url = new URL(src);
          console.warn(`[SafeImage] URL details:`, {
            protocol: url.protocol,
            hostname: url.hostname,
            pathname: url.pathname,
            search: url.search
          });
        } catch (urlError) {
          console.warn(`[SafeImage] Invalid URL format:`, src);
        }
      }
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    if (process.env.NODE_ENV === 'development' && src) {
      console.log(`[SafeImage] Изображение загружено успешно: ${src}`);
    }
  };

  const handleLoadStart = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SafeImage] Начинаем загрузку: ${imageSrc}`);
    }
  };

  // Проверяем валидность URL перед загрузкой
  const isValidUrl = (url: string) => {
    if (!url || url === '/default-avatar.svg') return true;
    
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  // Если URL невалидный, сразу показываем fallback
  if (!isValidUrl(imageSrc) && !hasError) {
    setHasError(true);
    setImageSrc('/default-avatar.svg');
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      fill={fill}
      sizes={sizes}
      width={width}
      height={height}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
      onLoadStart={handleLoadStart}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNlNWU3ZWIiLz4KPGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iOCIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTYgNDhjMC04LjgzNyA3LjE2My0xNiAxNi0xNnMxNiA3LjE2MyAxNiAxNiIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4K"
      unoptimized={true}
      style={{
        backgroundColor: isLoading ? '#f3f4f6' : 'transparent'
      }}
    />
  );
} 