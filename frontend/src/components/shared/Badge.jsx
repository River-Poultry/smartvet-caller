import clsx from 'clsx';

const variants = {
  green:  'bg-green-900/50 text-green-300 border border-green-700',
  teal:   'bg-teal-900/50 text-teal-300 border border-teal-700',
  red:    'bg-red-900/50 text-red-300 border border-red-700',
  yellow: 'bg-amber-900/50 text-amber-300 border border-amber-700',
  blue:   'bg-teal-900/50 text-teal-300 border border-teal-700',
  gray:   'bg-gray-800/50 text-gray-400 border border-gray-700',
  vet:    'bg-teal-900/60 text-teal-200 border border-teal-600',
};

export function Badge({ variant = 'gray', className, children }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
