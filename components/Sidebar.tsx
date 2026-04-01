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
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

const menu: { href: string; label: string; icon: any; roles: UserRole[] }[] = [
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
      <button className="primary-button fixed right-4 top-4 z-50 h-14 w-14 rounded-full p-0 lg:hidden shadow-xl" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`sidebar-shell ${open ? 'fixed inset-y-4 left-4 z-40 block' : 'hidden'} lg:sticky lg:top-6 lg:block`}>
        <div>
          <div className="mb-8 flex items-center gap-3 px-2">
            <Image src="/icon-smartpark.svg" alt="SmartPark" width={48} height={48} priority />
            <div className="min-w-0">
              <div className="truncate text-[24px] font-bold leading-none text-slate-950">SmartPark</div>
              <div className="truncate pt-1 text-xs font-medium text-slate-500">Seu Estacionamento Inteligente</div>
            </div>
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

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-1.5">
            <div className="text-lg font-bold text-slate-950 lg:text-base">{profile.name}</div>
            <div className="break-all text-sm text-slate-500 lg:text-xs">{profile.email}</div>
            <div className="pt-2"><span className="inline-flex rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 lg:px-3 lg:py-1 lg:font-semibold">{roleLabel}</span></div>
          </div>
          <button className="secondary-button mt-5 w-full justify-center h-14 lg:h-12 lg:mt-4" type="button" onClick={handleLogout}>
            <LogOut size={20} className="lg:size-4" />Sair
          </button>
        </div>
      </aside>
    </>
  );
}
