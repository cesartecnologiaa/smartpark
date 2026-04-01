import { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:mb-8 lg:gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">{title}</h1>
        <p className="mt-1 text-xs text-slate-500 lg:text-sm">{subtitle}</p>
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto lg:justify-end lg:gap-3">{actions}</div> : null}
    </div>
  );
}
