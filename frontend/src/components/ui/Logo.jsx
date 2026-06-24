export function Logo({ size = 'md', showText = false, className = '', imgClassName = '' }) {
  const sizes = { sm: 'h-7', md: 'h-10', lg: 'h-14' };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="SmartVet"
        className={`${sizes[size]} w-auto object-contain ${imgClassName}`}
        onError={e => { e.currentTarget.src = '/logo.svg'; }}
      />
      {showText && (
        <span className="text-sv-green font-bold text-lg tracking-tight">
          SmartVet
        </span>
      )}
    </div>
  );
}
