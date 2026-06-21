import clsx from 'clsx';

const variants = {
  primary:   'bg-green-700 hover:bg-green-800 text-white shadow-sm',
  teal:      'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
  ghost:     'hover:bg-gray-100 text-gray-600',
  warning:   'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ variant = 'primary', size = 'md', className, disabled, children, ...props }) {
  return (
    <button
      className={clsx(
        'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
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
