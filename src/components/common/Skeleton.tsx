import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text} h-4`}
            style={{ width: i === lines - 1 ? '75%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton layouts
export const BookCardSkeleton: React.FC = () => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <Skeleton variant="rectangular" height={160} className="mb-3" />
    <Skeleton variant="text" height={20} className="mb-2" />
    <Skeleton variant="text" width="60%" height={16} />
  </div>
);

export const ChapterListSkeleton: React.FC = () => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={`${70 + Math.random() * 30}%`} height={20} />
      </div>
    ))}
  </div>
);

export const ReaderContentSkeleton: React.FC = () => (
  <div className="p-6 max-w-3xl mx-auto">
    <Skeleton variant="text" width="40%" height={32} className="mb-6" />
    <Skeleton variant="text" lines={4} className="mb-4" />
    <Skeleton variant="text" lines={5} className="mb-4" />
    <Skeleton variant="text" lines={3} className="mb-4" />
    <Skeleton variant="text" lines={6} />
  </div>
);

export const AISummarySkeleton: React.FC = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-4">
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width={120} height={20} />
    </div>
    <Skeleton variant="text" lines={3} className="mb-3" />
    <Skeleton variant="text" lines={2} />
  </div>
);
