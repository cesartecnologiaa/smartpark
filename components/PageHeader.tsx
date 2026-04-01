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
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 lg:text-3xl">{title}</h1>
        <p className="mt-2 text-base text-slate-500 lg:mt-1 lg:text-sm">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-wrap">{actions}</div> : null}
    </div>
  );
}
