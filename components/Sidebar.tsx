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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const menu: MenuItem[] = [
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
      <button
        className="primary-outline fixed left-4 top-4 z-[60] lg:hidden"
        type="button"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open ? <button type="button" aria-label="Fechar menu" className="sidebar-backdrop lg:hidden" onClick={() => setOpen(false)} /> : null}

      <aside
        className={`sidebar-shell ${open ? 'sidebar-shell-mobile-open' : 'sidebar-shell-mobile-closed'} lg:sticky lg:top-6 lg:block`}
      >
        <div className="flex h-full flex-col">
          <div>
            <div className="mb-6 flex items-start justify-between gap-3 px-2">
              <div className="flex min-w-0 items-center gap-3">
                <Image src="/icon-smartpark.svg" alt="SmartPark" width={44} height={44} priority />
                <div className="min-w-0">
                  <div className="truncate text-[22px] font-bold leading-none text-slate-950">SmartPark</div>
                  <div className="truncate pt-1 text-xs font-medium text-slate-500">Seu Estacionamento Inteligente</div>
                </div>
              </div>
              <button type="button" className="secondary-button shrink-0 px-3 py-2 lg:hidden" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1.5">
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
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-950">{profile.name}</div>
              <div className="break-all text-xs text-slate-500">{profile.email}</div>
              <div className="pt-2"><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{roleLabel}</span></div>
            </div>
            <button className="secondary-button mt-4 w-full justify-center" type="button" onClick={handleLogout}>
              <LogOut size={16} />Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
