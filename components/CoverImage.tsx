'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  coverUrl?: string | null;
  sourceUrl?: string | null;
  title: string;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
  fallbackFontSize?: number;
}

function getYouTubeThumbnail(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  const shortMatch = sourceUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`;
  return null;
}

export function CoverImage({
  coverUrl,
  sourceUrl,
  title,
  fill = true,
  style,
  className,
  fallbackFontSize = 24,
}: CoverImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (coverUrl) {
      const src = coverUrl.startsWith('/') ? coverUrl : `/api/proxy/image?url=${encodeURIComponent(coverUrl)}`;
      setCurrentSrc(src);
    } else {
      const ytThumb = getYouTubeThumbnail(sourceUrl);
      setCurrentSrc(ytThumb);
    }
  }, [coverUrl, sourceUrl]);

  const handleError = () => {
    // If we haven't tried YouTube thumbnail yet, try it now
    const ytThumb = getYouTubeThumbnail(sourceUrl);
    if (ytThumb && currentSrc !== ytThumb) {
      setCurrentSrc(ytThumb);
      return;
    }
    // Otherwise fallback to initial letter
    setHasError(true);
    setCurrentSrc(null);
  };

  if (!currentSrc || hasError) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fallbackFontSize,
          fontWeight: 800,
          color: 'var(--text-faint)',
          userSelect: 'none',
          opacity: 0.3,
          ...style,
        }}
      >
        {title ? title.charAt(0).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={title}
      fill={fill}
      style={{ objectFit: 'cover', ...style }}
      className={className}
      unoptimized
      onError={handleError}
    />
  );
}

export default CoverImage;
