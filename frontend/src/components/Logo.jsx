export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="24" cy="24" r="24" fill="#C0392B" />
        <path
          d="M24 12c1.8 0 3.2 1.6 3.2 3.6 0 1.6-.9 2.9-2.2 3.4v2.4h2.6c2.6 0 4.7 2.2 4.7 4.9v4.1c0 .9-.7 1.6-1.6 1.6h-1.6v3.3c0 1-.8 1.7-1.7 1.7h-6.8c-1 0-1.7-.8-1.7-1.7v-3.3h-1.6c-.9 0-1.6-.7-1.6-1.6v-4.1c0-2.7 2.1-4.9 4.7-4.9h2.6V19c-1.3-.5-2.2-1.8-2.2-3.4 0-2 1.4-3.6 3.2-3.6z"
          fill="#FBF3C7"
        />
      </svg>
      <div className="leading-tight text-left">
        <p className="font-bold text-lg">
          <span className="text-brand-red">Smart</span>
          <span className="text-brand-green">Vet</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-brand-navy/60 -mt-1">Call Center</p>
      </div>
    </div>
  );
}
