import clsx from 'clsx';

const variants = {
  primary:   'bg-green-700 hover:bg-green-800 text-white shadow-sm',
  teal:      'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
  ghost:     'hover:bg-gray-100 text-gray-700',
  warning:   'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
};

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
};

export function Button({ variant = 'primary', size = 'md', className, disabled, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
        // Focus ring — visible for keyboard users, hidden on click
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
