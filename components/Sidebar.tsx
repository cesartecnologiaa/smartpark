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

const menu = [
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
] as const;

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
      <button className="primary-outline fixed right-4 top-4 z-50 lg:hidden" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside className={`sidebar-shell ${open ? 'fixed inset-y-4 left-4 right-4 z-40 block' : 'hidden'} lg:sticky lg:top-6 lg:block`}>
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

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">{profile.name}</div>
            <div className="break-all text-xs text-slate-500">{profile.email}</div>
            <div className="pt-2"><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{roleLabel}</span></div>
          </div>
          <button className="secondary-button mt-4 w-full justify-center" type="button" onClick={handleLogout}>
            <LogOut size={16} />Sair
          </button>
        </div>
      </aside>
    </>
  );
}
