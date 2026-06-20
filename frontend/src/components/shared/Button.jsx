import clsx from 'clsx';

const variants = {
  primary:   'bg-brand-green hover:bg-green-500 text-white shadow-lg shadow-green-900/30',
  teal:      'bg-brand-teal hover:bg-teal-400 text-white',
  danger:    'bg-brand-red hover:bg-red-500 text-white',
  secondary: 'bg-[#132b18] hover:bg-[#1e3a24] text-green-100 border border-[#1e3a24]',
  ghost:     'hover:bg-[#0d1f12] text-green-300',
  warning:   'bg-brand-amber hover:bg-amber-500 text-white',
};

export function Button({ variant = 'primary', size = 'md', className, disabled, children, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
  return (
    <button
      className={clsx(
        'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500',
        variants[variant], sizes[size],
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
