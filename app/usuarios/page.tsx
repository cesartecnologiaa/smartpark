"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, getAuth, signOut as signOutSecondary } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Plus, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { db, getSecondaryApp } from '@/lib/firebase';
import { AppUser, UserRole } from '@/types';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { useAuth } from '@/contexts/AuthContext';

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

  const tenantUsers = useMemo(() => rows.filter((user) => {
    const userTenantId = user.tenantId || DEFAULT_TENANT_ID;
    const profileTenantId = profile?.tenantId || DEFAULT_TENANT_ID;
    return userTenantId === profileTenantId;
  }), [profile?.tenantId, rows]);

  const filtered = useMemo(() => tenantUsers.filter((user) => filter === 'Todos' ? true : filter === 'Ativos' ? user.active !== false : user.active === false), [filter, tenantUsers]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const secondaryAuth = getAuth(getSecondaryApp());
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, 'users', credential.user.uid), { name, email, role, active: true, createdAt: new Date().toISOString(), tenantId: profile?.tenantId || DEFAULT_TENANT_ID });
      await signOutSecondary(secondaryAuth);
      setName(''); setEmail(''); setPassword(''); setRole('vendedor'); setShowForm(false);
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
        <PageHeader title="Usuários do Estabelecimento" subtitle="Gerencie usuários, permissões e acessos" actions={<button className="primary-button" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Novo Funcionário</button>} />
        <div className="mb-6 flex flex-wrap gap-3">{(['Todos', 'Ativos', 'Inativos'] as const).map((item) => <button key={item} className={`pill-tab ${filter === item ? 'pill-tab-active' : ''}`} onClick={() => setFilter(item)}>{item}</button>)}<span className="pill-tab">{tenantUsers.length} usuários</span></div>

        {showForm ? <div className="panel-card mb-6 p-6"><h2 className="text-lg font-semibold text-slate-900">Novo Funcionário</h2><form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleCreate}><input className="app-input" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required /><input className="app-input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="app-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required /><select className="app-input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}><option value="admin">Administrador</option><option value="vendedor">Vendedor</option></select><div className="flex gap-3"><button className="primary-button" type="submit">Salvar</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button></div></form></div> : null}
        {message ? <p className="mb-4 text-sm text-blue-700">{message}</p> : null}

        {filtered.length ? (
          <div className="panel-card p-6">
            <div className="space-y-3 md:hidden">
              {filtered.map((user) => (
                <div key={user.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nome</p>
                      <p className="mt-1 break-words text-base font-semibold text-slate-900">{user.name}</p>
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.active === false ? 'Inativo' : 'Ativo'}</span>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-500">E-mail</p>
                      <p className="break-all font-medium text-slate-900">{user.email}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-500">Permissão</p>
                      <p className="font-medium uppercase text-slate-900">{user.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button className="secondary-button w-full justify-center py-2 sm:w-auto" onClick={() => toggleRole(user)}>Alternar Usuário</button>
                    <button className="secondary-button w-full justify-center py-2 sm:w-auto" onClick={() => toggleActive(user)}>{user.active === false ? 'Ativar' : 'Desativar'}</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td className="break-all">{user.email}</td>
                        <td>{user.role}</td>
                        <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.active === false ? 'Inativo' : 'Ativo'}</span></td>
                        <td><div className="flex flex-wrap gap-2"><button className="secondary-button py-2" onClick={() => toggleRole(user)}>Alternar Role</button><button className="secondary-button py-2" onClick={() => toggleActive(user)}>{user.active === false ? 'Ativar' : 'Inativar'}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : <div className="empty-state"><div className="icon-soft-blue"><Users size={30} /></div><h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhum usuário encontrado.</h3><p className="mt-2 text-sm text-slate-500">Cadastre funcionários para controlar acessos por perfil.</p></div>}
      </div>
    </RoleGuard>
  );
}
