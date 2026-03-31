"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Car,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

const menu: Array<{ href: string; label: string; icon: LucideIcon; roles: UserRole[] }> = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'vendedor'] },
  { href: '/entrada', label: 'Entrada', icon: Car, roles: ['admin', 'vendedor'] },
  { href: '/saida', label: 'Saída', icon: CreditCard, roles: ['admin', 'vendedor'] },
  { href: '/mensalistas', label: 'Mensalistas', icon: Users, roles: ['admin', 'vendedor'] },
  { href: '/precos', label: 'Preços', icon: Tags, roles: ['admin'] },
  { href: '/caixa', label: 'Caixa', icon: Wallet, roles: ['admin', 'vendedor'] },
  { href: '/vagas', label: 'Vagas', icon: Warehouse, roles: ['admin', 'vendedor'] },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin'] },
  { href: '/usuarios', label: 'Usuários', icon: ShieldCheck, roles: ['admin'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin', 'vendedor'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const allowedMenu = useMemo(
    () => menu.filter((item) => (profile ? item.roles.includes(profile.role) : false)),
    [profile]
  );

  if (!profile) return null;

  const roleLabel = profile.role === 'admin' ? 'Administrador' : 'Vendedor';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      {!open ? (
        <button
          className="primary-outline fixed left-4 top-[max(16px,env(safe-area-inset-top))] z-50 lg:hidden"
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={18} />
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]">
              <div className="flex min-w-0 items-center gap-3">
                <Image src="/icon-smartpark.svg" alt="SmartPark" width={42} height={42} priority />
                <div className="min-w-0">
                  <div className="truncate text-[28px] font-bold leading-none text-slate-950">SmartPark</div>
                  <div className="truncate pt-1 text-xs font-medium text-slate-500">
                    Seu Estacionamento Inteligente
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button h-11 w-11 justify-center rounded-full px-0"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
              <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {allowedMenu.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <div className="text-base font-semibold text-slate-950">{profile.name}</div>
                  <div className="break-all text-xs text-slate-500">{profile.email}</div>
                  <div className="pt-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <button
                  className="secondary-button mt-4 w-full justify-center"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />Sair
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="sidebar-shell hidden lg:sticky lg:top-6 lg:flex lg:h-fit lg:max-h-[calc(100vh-48px)] lg:flex-col lg:overflow-hidden">
        <div className="min-h-0 flex-1">
          <div className="mb-8 flex items-center gap-3 px-2">
            <Image src="/icon-smartpark.svg" alt="SmartPark" width={48} height={48} priority />
            <div className="min-w-0">
              <div className="truncate text-[24px] font-bold leading-none text-slate-950">SmartPark</div>
              <div className="truncate pt-1 text-xs font-medium text-slate-500">Seu Estacionamento Inteligente</div>
            </div>
          </div>

          <nav className="space-y-1.5 overflow-y-auto pr-1">
            {allowedMenu.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">{profile.name}</div>
            <div className="break-all text-xs text-slate-500">{profile.email}</div>
            <div className="pt-2">
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {roleLabel}
              </span>
            </div>
          </div>
          <button className="secondary-button mt-4 w-full justify-center" type="button" onClick={handleLogout}>
            <LogOut size={16} />Sair
          </button>
        </div>
      </aside>
    </>
  );
}
