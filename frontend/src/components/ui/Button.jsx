import clsx from 'clsx';

const variants = {
  primary: [
    'bg-green-700 hover:bg-green-600 active:bg-green-800 text-white',
    'shadow-[0_2px_8px_rgba(21,128,61,0.35)] hover:shadow-[0_4px_16px_rgba(21,128,61,0.45)]',
    'border border-green-600',
  ].join(' '),

  teal: [
    'bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white',
    'shadow-[0_2px_8px_rgba(13,148,136,0.3)] hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)]',
    'border border-teal-500',
  ].join(' '),

  danger: [
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white',
    'shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_16px_rgba(220,38,38,0.4)]',
    'border border-red-500',
  ].join(' '),

  secondary: [
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800',
    'border border-slate-300 hover:border-slate-400',
    'shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
  ].join(' '),

  ghost: [
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700',
    'border border-transparent hover:border-slate-200',
  ].join(' '),

  warning: [
    'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white',
    'shadow-[0_2px_8px_rgba(217,119,6,0.3)]',
    'border border-amber-400',
  ].join(' '),
};

const sizes = {
  sm: 'px-3.5 py-2    text-sm  font-semibold tracking-wide min-h-[36px] gap-1.5',
  md: 'px-5   py-2.5  text-sm  font-semibold tracking-wide min-h-[42px] gap-2',
  lg: 'px-6   py-3    text-base font-bold     tracking-wide min-h-[48px] gap-2',
};

export function Button({ variant = 'primary', size = 'md', className, disabled, children, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
