/**
 * Skeleton Loader Components
 *
 * Provides loading placeholders for various UI elements
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-800 rounded ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Table header */}
      <div className="bg-gray-800/50 p-4 border-b border-gray-800">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-gray-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 mt-6">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Stats card skeleton
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

/**
 * Chart skeleton loader
 */
export function ChartSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="h-64 flex items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${Math.random() * 100 + 50}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

/**
 * Form skeleton loader
 */
export function FormSkeleton() {
  return (
    <div className="space-y-6 bg-gray-900 rounded-lg border border-gray-800 p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 mt-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Agent page specific skeleton
 */
export function AgentsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}

/**
 * Activity feed skeleton
 */
export function ActivityFeedSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Analytics page skeleton
 */
export function AnalyticsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <TableSkeleton rows={6} />
    </div>
  );
}

/* Add shimmer animation to global CSS */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}
