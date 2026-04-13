'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, LifeBuoy, Plus, ShieldX } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

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

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sua sessão expirou. Faça login novamente.');
  }

  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function ClientsManager() {
  const { profile, logout } = useAuth();
  const [items, setItems] = useState<ClientTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  async function loadClients() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/support/clients', {
        cache: 'no-store',
        headers: await getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar clientes.');
      setItems(data.items || []);
    } catch (err: any) {
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

    try {
      const response = await fetch('/api/support/clients', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ nome, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o token.');
      setGeneratedToken(data.token);
      setItems((current) => [data.item, ...current]);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const response = await fetch(`/api/support/clients/${id}/revoke`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível revogar o token.');
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status: 'EXPIRADO' } : item)));
    } catch (err: any) {
      setError(err?.message || 'Erro ao revogar token.');
    }
  }

  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'PENDENTE').length, [items]);

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="panel-card rounded-[28px] p-5 md:p-6">
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

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>TenantId</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Expira em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">Carregando clientes...</td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold text-slate-900">{item.nome}</td>
                    <td>{item.email}</td>
                    <td className="max-w-[240px] truncate font-mono text-[11px] text-slate-500 md:text-xs">{item.tenantId}</td>
                    <td>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.criadoEm)}</td>
                    <td>{formatDate(item.expiraEm)}</td>
                    <td>
                      <button
                        className="secondary-button !min-h-0 px-3 py-2 text-[11px]"
                        disabled={item.status !== 'PENDENTE'}
                        onClick={() => handleRevoke(item.id)}
                        type="button"
                      >
                        <ShieldX size={14} />
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">Nenhum cliente/token cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="panel-card w-full max-w-xl rounded-[28px] p-6">
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
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedToken);
                    }}
                    type="button"
                  >
                    <Copy size={16} />
                    Copiar token
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
              <form className="space-y-5" onSubmit={handleCreateClient}>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Novo cliente</h2>
                  <p className="mt-2 text-sm text-slate-500">Cadastre os dados básicos para gerar o token de primeiro acesso.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nome</label>
                  <input className="app-input h-12" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" required />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
                  <input className="app-input h-12" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@empresa.com" required />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button className="secondary-button" onClick={() => setModalOpen(false)} type="button">
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={saving} type="submit">
                    {saving ? 'Gerando...' : 'Gerar token'}
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
