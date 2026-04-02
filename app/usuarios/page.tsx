"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, getAuth, signOut as signOutSecondary } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserX, Users } from 'lucide-react';
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingName, setEditingName] = useState('');
  const [roleUser, setRoleUser] = useState<AppUser | null>(null);
  const [roleValue, setRoleValue] = useState<UserRole>('vendedor');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, 'id'> & { deleted?: boolean }) }))
        .filter((item) => !(item as any).deleted);
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

  function openEditUser(user: AppUser) {
    setMenuOpenId(null);
    setMenuPosition(null);
    setEditingUser(user);
    setEditingName(user.name || '');
  }

  async function handleEditUser(event: FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    setMessage('');
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editingName.trim() || editingUser.name,
        updatedAt: new Date().toISOString(),
      });
      setEditingUser(null);
      setEditingName('');
      setMessage('Usuário atualizado com sucesso.');
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao atualizar usuário.');
    }
  }

  function openRoleModal(user: AppUser) {
    setMenuOpenId(null);
    setMenuPosition(null);
    setRoleUser(user);
    setRoleValue(user.role || 'vendedor');
  }

  async function handleSaveRole(event: FormEvent) {
    event.preventDefault();
    if (!roleUser) return;
    setMessage('');
    try {
      await updateDoc(doc(db, 'users', roleUser.id), { role: roleValue, updatedAt: new Date().toISOString() });
      setRoleUser(null);
      setMessage('Cargo alterado com sucesso.');
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao alterar cargo.');
    }
  }

  async function handleDeleteUser(user: AppUser) {
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`Deseja excluir ${user.name}? O usuário será ocultado da lista e ficará sem acesso.`);
    if (!confirmed) return;
    setMenuOpenId(null);
    setMenuPosition(null);
    setMessage('');
    try {
      await updateDoc(doc(db, 'users', user.id), {
        active: false,
        deleted: true,
        deletedAt: new Date().toISOString(),
      });
      setMessage('Usuário excluído com sucesso.');
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao excluir usuário.');
    }
  }

  async function toggleActive(user: AppUser) {
    await updateDoc(doc(db, 'users', user.id), { active: user.active === false ? true : false });
  }

  function toggleActionMenu(event: MouseEvent<HTMLButtonElement>, userId: string, isOpen: boolean) {
    if (isOpen) {
      setMenuOpenId(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 210;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(Math.max(12, rect.right - menuWidth), viewportWidth - menuWidth - 12);
    const openUpwards = rect.bottom + 220 > viewportHeight;
    const top = openUpwards ? Math.max(12, rect.top - 190) : Math.min(rect.bottom + 8, viewportHeight - 190);

    setMenuOpenId(userId);
    setMenuPosition({ top, left });
  }

  function ActionMenu({ user }: { user: AppUser }) {
    const open = menuOpenId === user.id;
    return (
      <div className="relative overflow-visible">
        <button
          type="button"
          aria-label="Ações do usuário"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800"
          onClick={(event) => toggleActionMenu(event, user.id, open)}
        >
          <MoreHorizontal size={18} />
        </button>
        {open && menuPosition ? (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => { setMenuOpenId(null); setMenuPosition(null); }} aria-label="Fechar menu" />
            <div
              className="fixed z-50 min-w-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => openEditUser(user)}>
                <Pencil size={16} /> Editar usuário
              </button>
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => openRoleModal(user)}>
                <ShieldCheck size={16} /> Alterar cargo
              </button>
              <button type="button" className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition ${user.active === false ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'}`} onClick={() => { setMenuOpenId(null); setMenuPosition(null); toggleActive(user); }}>
                <UserX size={16} /> {user.active === false ? 'Ativar usuário' : 'Desativar'}
              </button>
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50" onClick={() => handleDeleteUser(user)}>
                <Trash2 size={16} /> Excluir usuário
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <PageHeader title="Usuários do Estabelecimento" subtitle="Gerencie usuários, permissões e acessos" actions={<button className="primary-button" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Novo Funcionário</button>} />
        <div className="mb-6 flex flex-wrap gap-3">{(['Todos', 'Ativos', 'Inativos'] as const).map((item) => <button key={item} className={`pill-tab ${filter === item ? 'pill-tab-active' : ''}`} onClick={() => setFilter(item)}>{item}</button>)}<span className="pill-tab">{tenantUsers.length} usuários</span></div>

        {showForm ? <div className="panel-card mb-6 p-6"><h2 className="text-lg font-semibold text-slate-900">Novo Funcionário</h2><form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleCreate}><input className="app-input" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required /><input className="app-input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="app-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required /><select className="app-input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}><option value="admin">Administrador</option><option value="vendedor">Vendedor</option></select><div className="flex gap-3"><button className="primary-button" type="submit">Salvar</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button></div></form></div> : null}
        {message ? <p className="mb-4 text-sm text-blue-700">{message}</p> : null}

        {filtered.length ? (
          <div>
            <div className="panel-card space-y-3 p-4 md:hidden">
              {filtered.map((user) => (
                <div key={user.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nome</p>
                      <p className="mt-1 break-words text-base font-semibold text-slate-900">{user.name}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.active === false ? 'Inativo' : 'Ativo'}</span>
                      <ActionMenu user={user} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-500">E-mail</p>
                      <p className="break-all font-medium text-slate-900">{user.email}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-500">Cargo</p>
                      <p className="font-medium text-slate-900">{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
                    </div>
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
                      <th>Cargo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td className="break-all">{user.email}</td>
                        <td>{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</td>
                        <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.active === false ? 'Inativo' : 'Ativo'}</span></td>
                        <td>
                          <ActionMenu user={user} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : <div className="empty-state"><div className="icon-soft-blue"><Users size={30} /></div><h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhum usuário encontrado.</h3><p className="mt-2 text-sm text-slate-500">Cadastre funcionários para controlar acessos por perfil.</p></div>}

        {editingUser ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Editar usuário</h3>
                  <p className="mt-1 text-sm text-slate-500">Você pode alterar o nome exibido do usuário.</p>
                </div>
                <button type="button" className="secondary-button px-3" onClick={() => setEditingUser(null)}>Fechar</button>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleEditUser}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
                  <input className="app-input" value={editingName} onChange={(e) => setEditingName(e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
                  <input className="app-input bg-slate-50" value={editingUser.email} disabled />
                  <p className="mt-1 text-xs text-slate-500">O e-mail de acesso não é alterado por esta tela.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" className="secondary-button" onClick={() => setEditingUser(null)}>Cancelar</button>
                  <button type="submit" className="primary-button">Salvar alterações</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {roleUser ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Alterar cargo</h3>
                  <p className="mt-1 text-sm text-slate-500">Defina o nível de acesso do usuário.</p>
                </div>
                <button type="button" className="secondary-button px-3" onClick={() => setRoleUser(null)}>Fechar</button>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleSaveRole}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Usuário</label>
                  <input className="app-input bg-slate-50" value={roleUser.name} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cargo</label>
                  <select className="app-input" value={roleValue} onChange={(e) => setRoleValue(e.target.value as UserRole)}>
                    <option value="admin">Administrador</option>
                    <option value="vendedor">Vendedor</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" className="secondary-button" onClick={() => setRoleUser(null)}>Cancelar</button>
                  <button type="submit" className="primary-button">Salvar cargo</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
