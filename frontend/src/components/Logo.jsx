import smartvetLogo from '../assets/smartvet-logo.png';

export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={smartvetLogo} alt="SmartVet" className="w-9 h-9 object-contain" />
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
