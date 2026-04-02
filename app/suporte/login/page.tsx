'use client';

import { FormEvent, useState } from 'react';
import { LifeBuoy, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupportLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/support/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível autenticar o suporte.');
      }

      router.replace('/suporte/clientes');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl items-center justify-center">
        <div className="panel-card w-full max-w-xl overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-slate-50/70 px-8 py-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <LifeBuoy size={16} />
              Área exclusiva do suporte SmartPark
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-slate-950">Entrar no suporte</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Faça login com as credenciais do time de suporte para gerar tokens de primeiro acesso.
            </p>
          </div>

          <div className="px-8 py-8 md:px-10 md:py-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="app-input h-14 pl-11"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="suporte@smartpark.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="app-input h-14 pl-11"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha do suporte"
                    required
                  />
                </div>
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
              ) : null}

              <button className="primary-button h-14 w-full justify-center text-base" disabled={loading}>
                {loading ? 'Entrando...' : 'Acessar painel de suporte'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
