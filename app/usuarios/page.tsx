"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, getAuth, signOut as signOutSecondary } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Plus, ShieldCheck, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { db, getSecondaryApp } from '@/lib/firebase';
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

  async function toggleActive(user: AppUser) {
    await updateDoc(doc(db, 'users', user.id), { active: user.active === false ? true : false });
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button className="secondary-button w-full justify-center" onClick={() => toggleRole(user)}>
                      Alterar Cargo
                    </button>
                    <button className="secondary-button w-full justify-center" onClick={() => toggleActive(user)}>
                      {user.active === false ? 'Ativar' : 'Inativar'}
                    </button>
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
                          <div className="flex flex-wrap gap-2">
                            <button className="secondary-button py-2" onClick={() => toggleRole(user)}>
                              Alterar Cargo
                            </button>
                            <button className="secondary-button py-2" onClick={() => toggleActive(user)}>
                              {user.active === false ? 'Ativar' : 'Inativar'}
                            </button>
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
