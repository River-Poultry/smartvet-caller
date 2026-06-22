import clsx from 'clsx';

const variants = {
  green:  'bg-green-100 text-green-800 border border-green-200',
  teal:   'bg-teal-100 text-teal-800 border border-teal-200',
  red:    'bg-red-100 text-red-700 border border-red-200',
  yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
  blue:   'bg-blue-100 text-blue-800 border border-blue-200',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
  vet:    'bg-teal-100 text-teal-800 border border-teal-200',
};

const darkVariants = {
  green:  'dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  teal:   'dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700',
  red:    'dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  yellow: 'dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  blue:   'dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  gray:   'dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600',
  vet:    'dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-600',
};

export function Badge({ variant = 'gray', className, children }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variants[variant],
      darkVariants[variant],
      className
    )}>
      {children}
    </span>
  );
}
