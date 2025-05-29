'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'md', fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-6',
  };

  const spinner = (
    <div className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}></div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-4">{spinner}</div>;
} 