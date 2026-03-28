import { ReactNode } from 'react';

export default function GlassCard({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm text-white/65">{title}</p>
          {value ? <h3 className="mt-2 text-3xl font-bold">{value}</h3> : null}
        </div>
        {icon ? <div className="rounded-2xl border border-white/10 bg-white/10 p-3">{icon}</div> : null}
      </div>
      {children}
    </div>
  );
}
