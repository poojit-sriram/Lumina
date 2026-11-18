import { useState } from 'react';
import { Camera } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  onDoubleClick?: () => void;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  onDoubleClick,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        onDoubleClick={onDoubleClick}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400 ${className}`}
      >
        <Camera className="h-7 w-7 opacity-60" strokeWidth={1.5} />
        {fallbackLabel && (
          <span className="mt-2 max-w-[80%] truncate text-xs font-medium">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onDoubleClick={onDoubleClick}
      className={className}
    />
  );
}
