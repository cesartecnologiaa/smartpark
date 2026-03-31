"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut as signOutSecondary } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ExternalLink, KeyRound, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { createPortal } from 'react-dom';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { auth, db, getSecondaryApp } from '@/lib/firebase';
import { AppUser, UserRole } from '@/types';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { useAuth } from '@/contexts/AuthContext';

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
];

function roleLabel(role: UserRole) {
  return role === 'admin' ? 'Administrador' : 'Vendedor';
}

export default function UsuariosPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('vendedor');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Todos');
  const [openActionFor, setOpenActionFor] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, 'id'>) }));
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setRows(items);
    });
    return () => unsub();
  }, []);

  const tenantUsers = useMemo(
    () =>
      rows.filter((user) => {
        const userTenantId = user.tenantId || DEFAULT_TENANT_ID;
        const profileTenantId = profile?.tenantId || DEFAULT_TENANT_ID;
        return userTenantId === profileTenantId;
      }),
    [profile?.tenantId, rows]
  );

  const filtered = useMemo(
    () =>
      tenantUsers.filter((user) =>
        filter === 'Todos' ? true : filter === 'Ativos' ? user.active !== false : user.active === false
      ),
    [filter, tenantUsers]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!openActionFor) return;
      const target = event.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      setOpenActionFor(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenActionFor(null);
    }

    if (openActionFor) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionFor]);

  function openActionsMenu(event: React.MouseEvent<HTMLButtonElement>, userId: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.min(Math.max(12, rect.right - menuWidth), viewportWidth - menuWidth - 12);
    let top = rect.bottom + 10;

    if (top + 180 > viewportHeight) {
      top = Math.max(12, rect.top - 164);
    }

    setMenuPosition({ top, left });
    setOpenActionFor((current) => (current === userId ? null : userId));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const secondaryAuth = getAuth(getSecondaryApp());
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        email,
        role,
        active: true,
        createdAt: new Date().toISOString(),
        tenantId: profile?.tenantId || DEFAULT_TENANT_ID,
      });
      await signOutSecondary(secondaryAuth);
      setName('');
      setEmail('');
      setPassword('');
      setRole('vendedor');
      setShowForm(false);
      setMessage('Usuário criado com sucesso.');
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao criar usuário.');
    }
  }

  async function toggleRole(user: AppUser) {
    const nextRole: UserRole = user.role === 'admin' ? 'vendedor' : 'admin';
    await updateDoc(doc(db, 'users', user.id), { role: nextRole });
  }


  async function handlePasswordReset(user: AppUser) {
    try {
      setBusyAction(`password-${user.id}`);
      await sendPasswordResetEmail(auth, user.email);
      setMessage(`Link para redefinição de senha enviado para ${user.email}.`);
      setOpenActionFor(null);
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível enviar a redefinição de senha.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleChangeRole(user: AppUser) {
    try {
      setBusyAction(`role-${user.id}`);
      await toggleRole(user);
      setMessage(`Cargo de ${user.name} atualizado com sucesso.`);
      setOpenActionFor(null);
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível alterar o cargo.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteUser(user: AppUser) {
    const confirmed = typeof window === 'undefined' ? false : window.confirm(`Deseja excluir ${user.name}? O acesso será bloqueado e o usuário ficará inativo.`);
    if (!confirmed) return;

    try {
      setBusyAction(`delete-${user.id}`);
      await updateDoc(doc(db, 'users', user.id), {
        active: false,
        deletedAt: new Date().toISOString(),
      });
      setMessage(`Usuário ${user.name} excluído com sucesso.`);
      setOpenActionFor(null);
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível excluir o usuário.');
    } finally {
      setBusyAction(null);
    }
  }

  function renderActionsMenu(user: AppUser) {
    const isOpen = openActionFor === user.id;

    return (
      <>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          onClick={(event) => openActionsMenu(event, user.id)}
          aria-label={`Abrir ações de ${user.name}`}
        >
          <ExternalLink size={18} />
        </button>

        {isOpen && menuPosition && typeof document !== 'undefined'
          ? createPortal(
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[9998] bg-black/5 backdrop-blur-[1px]"
                  onClick={() => setOpenActionFor(null)}
                  aria-label="Fechar ações"
                />
                <div
                  ref={menuRef}
                  className="fixed z-[9999] min-w-[220px] rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    onClick={() => handleChangeRole(user)}
                    disabled={busyAction === `role-${user.id}`}
                  >
                    <ShieldCheck size={16} />
                    <span>Cargo</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    onClick={() => handlePasswordReset(user)}
                    disabled={busyAction === `password-${user.id}`}
                  >
                    <KeyRound size={16} />
                    <span>Alterar senha</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    onClick={() => handleDeleteUser(user)}
                    disabled={busyAction === `delete-${user.id}`}
                  >
                    <Trash2 size={16} />
                    <span>Excluir usuário</span>
                  </button>
                </div>
              </>,
              document.body
            )
          : null}
      </>
    );
  }

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <PageHeader
          title="Usuários do Estabelecimento"
          subtitle="Gerencie usuários, cargos e acessos da sua empresa."
          actions={
            <button className="primary-button" onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} />Novo Funcionário
            </button>
          }
        />

        <div className="mb-6 flex flex-wrap gap-3">
          {(['Todos', 'Ativos', 'Inativos'] as const).map((item) => (
            <button
              key={item}
              className={`pill-tab ${filter === item ? 'pill-tab-active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
          <span className="pill-tab">{tenantUsers.length} usuários</span>
        </div>

        {showForm ? (
          <div className="panel-card mb-6 p-4 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="icon-soft-blue">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Novo Funcionário</h2>
                <p className="mt-1 text-sm text-slate-500">Cadastre o usuário e defina o cargo inicial.</p>
              </div>
            </div>

            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleCreate}>
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input className="app-input" placeholder="Nome do funcionário" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input className="app-input" type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Senha</label>
                <input className="app-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">Cargo</label>
                <select className="app-input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:col-span-2 xl:col-span-3 xl:items-end xl:justify-end">
                <button className="primary-button w-full sm:w-auto" type="submit">
                  Salvar
                </button>
                <button className="secondary-button w-full sm:w-auto" type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {message ? <p className="mb-4 text-sm text-blue-700">{message}</p> : null}

        {filtered.length ? (
          <>
            <div className="space-y-4 lg:hidden">
              {filtered.map((user) => (
                <article key={user.id} className="panel-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900">{user.name}</h3>
                      <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                    </div>
                    <div className="icon-soft-blue shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Cargo</span>
                      <strong className="text-right text-slate-900">{roleLabel(user.role)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Status</span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.active === false ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {user.active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    {renderActionsMenu(user)}
                  </div>
                </article>
              ))}
            </div>

            <div className="panel-card hidden p-6 lg:block">
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Cargo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{roleLabel(user.role)}</td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {user.active === false ? 'Inativo' : 'Ativo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end">
                            {renderActionsMenu(user)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="icon-soft-blue">
              <Users size={30} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhum usuário encontrado.</h3>
            <p className="mt-2 text-sm text-slate-500">Cadastre funcionários para controlar acessos por cargo.</p>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
