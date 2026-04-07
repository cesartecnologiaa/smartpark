'use client';

import { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export default function RoleGuard({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { profile } = useAuth();
  if (!profile) return null;
  const allowedRoles = roles.includes('admin') && !roles.includes('suporte') ? [...roles, 'suporte'] : roles;
  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="empty-state">
        <div className="icon-soft-red"><ShieldAlert size={28} /></div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Acesso restrito</h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">Você não possui permissão para acessar este módulo com o perfil atual.</p>
      </div>
    );
  }
  return <>{children}</>;
}
