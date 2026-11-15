'use client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center space-x-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {actionButton}
        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-semibold text-slate-700">En direct (Abidjan UTC)</span>
        </div>
      </div>
    </header>
  );
}
