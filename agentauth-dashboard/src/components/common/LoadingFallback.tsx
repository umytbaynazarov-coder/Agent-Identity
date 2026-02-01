/**
 * LoadingFallback Component
 *
 * Used as Suspense fallback while lazy-loaded components are loading
 */

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-4 text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Minimal loading spinner for smaller components
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${sizeClasses[size]} inline-block animate-spin rounded-full border-solid border-teal-500 border-r-transparent`}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Page-level loading state with skeleton
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/3"></div>
        </div>

        {/* Content skeleton */}
        <div className="grid gap-6 animate-pulse">
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}
