import clsx from 'clsx';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'neutral', children, size = 'md' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size])}>
      {children}
    </span>
  );
}

// Helper function to get badge variant from status
export function getStatusBadgeVariant(
  status: 'active' | 'inactive' | 'suspended' | 'revoked'
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'neutral';
    case 'suspended':
      return 'warning';
    case 'revoked':
      return 'danger';
    default:
      return 'neutral';
  }
}
