'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Copy, Eye, EyeOff, LifeBuoy, Loader2, MoreVertical, Plus, ShieldX, Trash2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';

type ClientTokenStatus = 'PENDENTE' | 'UTILIZADO' | 'EXPIRADO';

interface ClientTokenItem {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
  token: string;
  status: ClientTokenStatus;
  criadoEm: string;
  expiraEm: string;
  utilizadoEm?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function statusClasses(status: ClientTokenStatus) {
  if (status === 'UTILIZADO') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'EXPIRADO') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function normalizeStatus(data: any): ClientTokenStatus {
  const raw = String(data?.status || 'PENDENTE').toUpperCase();
  if (raw === 'UTILIZADO') return 'UTILIZADO';
  if (raw === 'EXPIRADO') return 'EXPIRADO';

  const expiraEm = data?.expiraEm?.toDate ? data.expiraEm.toDate() : new Date(data?.expiraEm || 0);
  if (!Number.isNaN(expiraEm.getTime()) && expiraEm.getTime() < Date.now()) {
    return 'EXPIRADO';
  }

  return 'PENDENTE';
}

function mapTokenDoc(id: string, data: any): ClientTokenItem {
  return {
    id,
    nome: data?.nome || '',
    email: data?.email || '',
    tenantId: data?.tenantId || '',
    token: data?.token || id,
    status: normalizeStatus(data),
    criadoEm: data?.criadoEm?.toDate ? data.criadoEm.toDate().toISOString() : data?.criadoEm || '',
    expiraEm: data?.expiraEm?.toDate ? data.expiraEm.toDate().toISOString() : data?.expiraEm || '',
    utilizadoEm: data?.utilizadoEm?.toDate ? data.utilizadoEm.toDate().toISOString() : data?.utilizadoEm || null,
  };
}

function generateTenantId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export default function ClientsManager() {
  const { profile, logout } = useAuth();
  const [items, setItems] = useState<ClientTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [visibleTokenId, setVisibleTokenId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionItem, setActionItem] = useState<ClientTokenItem | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  async function loadClients() {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'client_tokens'), orderBy('criadoEm', 'desc')));
      const list = snap.docs.map((item) => mapTokenDoc(item.id, item.data()));
      setItems(list);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleCreateClient(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setCopied(false);

    try {
      const normalizedName = nome.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedName || !normalizedEmail) {
        throw new Error('Preencha nome e e-mail.');
      }

      const token = generateToken();
      const tenantId = generateTenantId();
      const now = new Date();
      const expiraEm = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const payload = {
        nome: normalizedName,
        email: normalizedEmail,
        tenantId,
        token,
        status: 'PENDENTE' as ClientTokenStatus,
        criadoEm: Timestamp.fromDate(now),
        expiraEm: Timestamp.fromDate(expiraEm),
        utilizadoEm: null,
        criadoPorUid: profile?.id || null,
        criadoPorEmail: profile?.email || null,
      };

      await setDoc(doc(db, 'client_tokens', token), payload);

      setGeneratedToken(token);
      setSuccess('Cliente criado com sucesso.');
      setNome('');
      setEmail('');
      await loadClients();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar o token.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'client_tokens', id), {
        status: 'EXPIRADO',
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: 'EXPIRADO' } : item))
      );
      setSuccess('Token revogado com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revogar o token.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleDelete(id: string) {
    setRevokingId(id);
    setError('');
    setSuccess('');
    try {
      await deleteDoc(doc(db, 'client_tokens', id));
      setItems((current) => current.filter((item) => item.id !== id));
      setSuccess('Token excluído com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir o token.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopyToken(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setSuccess('Token copiado.');
    } catch {
      setError('Não foi possível copiar o token.');
    }
  }

  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  function maskToken(token: string) {
    if (!token) return '—';
    if (token.length <= 10) return token;
    return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
  }

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'PENDENTE').length, [items]);

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="panel-card rounded-3xl p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <LifeBuoy size={14} />
                Painel de suporte SmartPark
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-slate-950 md:text-3xl">Clientes e tokens de primeiro acesso</h1>
              <p className="mt-2 text-sm text-slate-500">
                {pendingCount} token(s) pendente(s) aguardando ativação.
                {profile?.email ? ` Sessão ativa como ${profile.email}.` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="secondary-button" onClick={handleLogout} type="button">
                Sair
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setModalOpen(true);
                  setGeneratedToken(null);
                  setNome('');
                  setEmail('');
                  setCopied(false);
                  setError('');
                  setSuccess('');
                }}
                type="button"
              >
                <Plus size={16} />
                Novo cliente
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        <div className="panel-card overflow-hidden rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-semibold">Nome</th>
                  <th className="px-4 py-4 font-semibold">E-mail</th>
                  <th className="px-4 py-4 font-semibold">TenantId</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Token</th>
                  <th className="px-4 py-4 font-semibold">Criado em</th>
                  <th className="px-4 py-4 font-semibold">Expira em</th>
                  <th className="w-[88px] px-4 py-4 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} /> Carregando tokens...
                      </div>
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item) => {
                    const showFullToken = visibleTokenId === item.id;
                    const canShowToken = item.status === 'PENDENTE';
                    return (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 font-medium text-slate-900">{item.nome}</td>
                        <td className="px-4 py-4">{item.email}</td>
                        <td className="px-4 py-4 font-mono text-xs">{item.tenantId}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {canShowToken ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{showFullToken ? item.token : maskToken(item.token)}</span>
                              <button
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                                onClick={() => setVisibleTokenId(showFullToken ? null : item.id)}
                                type="button"
                              >
                                {showFullToken ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                                onClick={() => handleCopyToken(item.token)}
                                type="button"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-4">{formatDate(item.criadoEm)}</td>
                        <td className="px-4 py-4">{formatDate(item.expiraEm)}</td>
                        <td className="px-4 py-4 text-center">
                          <button
                            aria-label="Abrir ações do token"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={revokingId === item.id}
                            onClick={() => setActionItem(item)}
                            type="button"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">Nenhum cliente/token cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {actionItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-6 sm:items-center">
          <div className="panel-card w-full max-w-sm rounded-3xl p-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Ações do token</h3>
              <p className="mt-1 text-sm text-slate-500">{actionItem.nome} • {actionItem.email}</p>
            </div>
            <div className="mt-5 space-y-3">
              <button
                className="secondary-button w-full justify-center"
                disabled={actionItem.status !== 'PENDENTE' || revokingId === actionItem.id}
                onClick={async () => {
                  await handleRevoke(actionItem.id);
                  setActionItem(null);
                }}
                type="button"
              >
                <ShieldX size={16} />
                Revogar token
              </button>
              <button
                className="secondary-button w-full justify-center border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={revokingId === actionItem.id}
                onClick={async () => {
                  await handleDelete(actionItem.id);
                  setActionItem(null);
                }}
                type="button"
              >
                <Trash2 size={16} />
                Excluir token
              </button>
              <button className="primary-button w-full justify-center" onClick={() => setActionItem(null)} type="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="panel-card w-full max-w-xl rounded-3xl p-6">
            {generatedToken ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Token gerado com sucesso</h2>
                  <p className="mt-2 text-sm text-slate-500">Copie este token e envie para o cliente concluir o primeiro acesso.</p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="break-all font-mono text-sm font-semibold text-blue-800">{generatedToken}</div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button className="secondary-button" onClick={() => handleCopyToken(generatedToken)} type="button">
                    <Copy size={16} />
                    {copied ? 'Copiado' : 'Copiar token'}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setModalOpen(false);
                      setGeneratedToken(null);
                    }}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleCreateClient}>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Novo cliente</h2>
                  <p className="mt-2 text-sm text-slate-500">Crie um token de primeiro acesso para um novo cliente.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nome</label>
                  <input className="app-input h-12" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" required />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
                  <input
                    className="app-input h-12"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@empresa.com"
                    required
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button className="secondary-button" onClick={() => setModalOpen(false)} type="button">
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={saving} type="submit">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Gerar token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
