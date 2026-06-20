export function Logo({ size = 'md', showText = false }) {
  const sizes = { sm: 'h-8', md: 'h-10', lg: 'h-14' };

  // Prefer PNG logo if available, fall back to SVG
  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.png"
        alt="SmartVet"
        className={`${sizes[size]} w-auto object-contain`}
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
