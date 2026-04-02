'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { Copy, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';

type ClientTokenStatus = 'PENDENTE' | 'UTILIZADO' | 'EXPIRADO';

type ClientTokenItem = {
  id: string;
  nome?: string;
  email?: string;
  tenantId?: string;
  token?: string;
  status?: ClientTokenStatus | string;
  criadoEm?: string;
  expiraEm?: string;
  utilizadoEm?: string | null;
};

type ClientsResponse = {
  items: ClientTokenItem[];
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function statusClass(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'UTILIZADO':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'EXPIRADO':
      return 'bg-red-100 text-red-700 border border-red-200';
    default:
      return 'bg-amber-100 text-amber-700 border border-amber-200';
  }
}

async function getIdTokenOrThrow() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  return user.getIdToken(true);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao processar requisição.');
  }

  return data as T;
}

export default function ClientsManager() {
  const [items, setItems] = useState<ClientTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  const [generatedToken, setGeneratedToken] = useState('');
  const [generatedTenantId, setGeneratedTenantId] = useState('');

  const pendingCount = useMemo(
    () => items.filter((item) => String(item.status || '').toUpperCase() === 'PENDENTE').length,
    [items]
  );

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const idToken = await getIdTokenOrThrow();

      const response = await fetch('/api/support/clients', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: 'no-store',
      });

      const data = await parseApiResponse<ClientsResponse>(response);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  async function handleCreateClient() {
    setSubmitting(true);
    setError('');
    setSuccess('');
    setCopied(false);

    try {
      if (!nome.trim() || !email.trim()) {
        throw new Error('Preencha nome e e-mail.');
      }

      const idToken = await getIdTokenOrThrow();

      const response = await fetch('/api/support/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
        }),
      });

      const data = await parseApiResponse<{
        item?: ClientTokenItem;
        token?: string;
      }>(response);

      setGeneratedToken(data.token || '');
      setGeneratedTenantId(data.item?.tenantId || '');
      setSuccess('Cliente criado com sucesso.');
      setNome('');
      setEmail('');
      await loadClients();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar o cliente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError('');
    setSuccess('');

    try {
      const idToken = await getIdTokenOrThrow();

      const response = await fetch(`/api/support/clients/${id}/revoke`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      await parseApiResponse<{ item?: ClientTokenItem }>(response);
      setSuccess('Token revogado com sucesso.');
      await loadClients();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível revogar o token.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopyToken() {
    if (!generatedToken) return;

    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleLogout() {
    const auth = getAuth();
    await signOut(auth);
    window.location.href = '/login';
  }

  function openModal() {
    setShowModal(true);
    setError('');
    setSuccess('');
    setGeneratedToken('');
    setGeneratedTenantId('');
    setCopied(false);
  }

  function closeModal() {
    setShowModal(false);
    setNome('');
    setEmail('');
    setGeneratedToken('');
    setGeneratedTenantId('');
    setCopied(false);
    setError('');
    setSuccess('');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              Painel de suporte SmartPark
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Clientes e tokens de primeiro acesso
            </h1>
            <p className="mt-2 text-slate-600">
              {pendingCount} token(s) pendente(s) aguardando ativação.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sair
            </button>

            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo cliente
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-4 py-4 font-semibold">Nome</th>
                <th className="px-4 py-4 font-semibold">E-mail</th>
                <th className="px-4 py-4 font-semibold">TenantId</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Criado em</th>
                <th className="px-4 py-4 font-semibold">Expira em</th>
                <th className="px-4 py-4 font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando clientes...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-slate-500">
                    Nenhum cliente/token cadastrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const normalizedStatus = String(item.status || 'PENDENTE').toUpperCase();

                  return (
                    <tr key={item.id} className="text-slate-700">
                      <td className="px-4 py-4 font-medium">{item.nome || '-'}</td>
                      <td className="px-4 py-4">{item.email || '-'}</td>
                      <td className="px-4 py-4 font-mono text-xs">{item.tenantId || '-'}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            normalizedStatus
                          )}`}
                        >
                          {normalizedStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">{formatDate(item.criadoEm)}</td>
                      <td className="px-4 py-4">{formatDate(item.expiraEm)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleRevoke(item.id)}
                          disabled={
                            revokingId === item.id || normalizedStatus === 'EXPIRADO'
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {revokingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Revogar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Novo cliente</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Gere um token de primeiro acesso para um novo cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            {!generatedToken ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nome</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-blue-400"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-blue-400"
                    placeholder="cliente@empresa.com"
                    type="email"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Gerar token
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">Token gerado com sucesso</p>
                  <p className="mt-2 break-all rounded-xl bg-white px-3 py-3 font-mono text-sm text-slate-800">
                    {generatedToken}
                  </p>

                  <div className="mt-3 text-sm text-slate-600">
                    <strong>TenantId:</strong> {generatedTenantId || '-'}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar token'}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
