import { ReactNode } from 'react';

export default function StatCard({
  title,
  value,
  icon,
  hint,
  tone = 'blue',
}: {
  title: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  tone?: 'blue' | 'green' | 'red' | 'slate';
}) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="panel-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</h3>
          {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${toneMap[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}
