'use client';

import Image from 'next/image';
import { useState } from 'react';

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

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc('/default-avatar.svg');
      console.warn(`Ошибка загрузки изображения: ${src}`);
    }
  };

  const handleLoad = () => {
    if (process.env.NODE_ENV === 'development' && src) {
      console.log(`Изображение загружено успешно: ${src}`);
    }
  };

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
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNlNWU3ZWIiLz4KPGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iOCIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTYgNDhjMC04LjgzNyA3LjE2My0xNiAxNi0xNnMxNiA3LjE2MyAxNiAxNiIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4K"
      unoptimized={process.env.NODE_ENV === 'development'}
    />
  );
} 