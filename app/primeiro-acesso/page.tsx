'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setLoading(true);

    try {
      const validateResponse = await fetch('/api/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', token }),
      });
      const validateData = await validateResponse.json();
      if (!validateResponse.ok) {
        throw new Error(validateData.error || 'Não foi possível validar o token.');
      }

      const tokenDoc = validateData.tokenDoc as {
        id: string;
        email: string;
        nome: string;
        tenantId: string;
      };

      const credential = await createUserWithEmailAndPassword(auth, tokenDoc.email, senha);
      await setDoc(
        doc(db, 'users', credential.user.uid),
        {
          name: tokenDoc.nome,
          email: tokenDoc.email,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          tenantId: tokenDoc.tenantId,
        },
        { merge: true }
      );

      const finalizeResponse = await fetch('/api/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', docId: tokenDoc.id }),
      });
      const finalizeData = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizeData.error || 'Conta criada, mas o token não pôde ser finalizado.');
      }

      setSuccess('Conta criada com sucesso. Redirecionando...');
      router.replace('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erro ao concluir o primeiro acesso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl items-center justify-center">
        <div className="panel-card w-full max-w-2xl overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-slate-50/70 px-8 py-8">
            <h1 className="text-3xl font-semibold text-slate-950">Primeiro acesso do cliente</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Informe o token enviado pelo suporte e defina a senha inicial do administrador do estacionamento.
            </p>
          </div>

          <div className="px-8 py-8 md:px-10 md:py-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Token de acesso</label>
                <input className="app-input h-12 font-mono" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole aqui o token" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
                <input className="app-input h-12" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Crie sua senha" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirmar senha</label>
                <input className="app-input h-12" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" required />
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
              ) : null}

              {success ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
              ) : null}

              <button className="primary-button h-12 w-full justify-center text-sm md:text-base" disabled={loading}>
                {loading ? 'Concluindo...' : 'Criar conta e entrar no sistema'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
