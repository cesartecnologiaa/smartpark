"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Car,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
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
  { href: '/suporte/clientes', label: 'Suporte', icon: LifeBuoy, roles: ['suporte'] },
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

  const roleLabel =
    profile.role === 'admin' ? 'Administrador' : profile.role === 'suporte' ? 'Suporte' : 'Vendedor';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <button className="primary-button fixed right-2 top-2 z-50 h-10 w-10 rounded-full p-0 lg:hidden" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`sidebar-shell ${open ? 'fixed inset-y-2 left-2 z-40 block max-w-xs' : 'hidden'} lg:sticky lg:top-6 lg:block`}>
        <div>
          <div className="mb-6 flex items-center gap-2 px-1">
            <Image src="/icon-smartpark.svg" alt="SmartPark" width={40} height={40} priority />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-none text-slate-950 lg:text-xl">SmartPark</div>
              <div className="truncate pt-0.5 text-xs font-medium text-slate-500">Seu Estacionamento</div>
            </div>
          </div>

          <nav className="space-y-0.5">
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
                  <Icon size={16} />
                  <span className="text-xs lg:text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:mt-8 lg:p-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-950 lg:text-base">{profile.name}</div>
            <div className="break-all text-xs text-slate-500">{profile.email}</div>
            <div className="pt-1.5"><span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 lg:px-3 lg:py-1">{roleLabel}</span></div>
          </div>
          <button className="secondary-button mt-3 w-full justify-center h-10 text-xs lg:mt-4 lg:h-12 lg:text-sm" type="button" onClick={handleLogout}>
            <LogOut size={16} className="lg:size-4" />Sair
          </button>
        </div>
      </aside>
    </>
  );
}
