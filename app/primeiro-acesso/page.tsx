'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

import { auth, db, getSecondaryApp } from '@/lib/firebase';

function normalizeTokenStatus(data: any) {
  const raw = String(data?.status || 'PENDENTE').toUpperCase();
  if (raw === 'UTILIZADO') return 'UTILIZADO';
  if (raw === 'EXPIRADO') return 'EXPIRADO';

  const expiraEm = data?.expiraEm?.toDate ? data.expiraEm.toDate() : new Date(data?.expiraEm || 0);
  if (!Number.isNaN(expiraEm.getTime()) && expiraEm.getTime() < Date.now()) {
    return 'EXPIRADO';
  }

  return 'PENDENTE';
}

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

    const normalizedToken = token.trim();
    if (!normalizedToken) {
      setError('Informe o token de acesso.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setLoading(true);

    const secondaryAuth = getAuth(getSecondaryApp());

    try {
      const tokenRef = doc(db, 'client_tokens', normalizedToken);
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists()) {
        throw new Error('Token inválido.');
      }

      const tokenData = tokenSnap.data() as any;
      const tokenStatus = normalizeTokenStatus(tokenData);

      if (tokenStatus === 'UTILIZADO') {
        throw new Error('Token já utilizado.');
      }

      if (tokenStatus === 'EXPIRADO') {
        throw new Error('Token expirado.');
      }

      const email = String(tokenData?.email || '').trim().toLowerCase();
      const nome = String(tokenData?.nome || 'Administrador').trim();
      const tenantId = String(tokenData?.tenantId || '').trim();

      if (!email || !tenantId) {
        throw new Error('Token inválido ou incompleto.');
      }

      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, senha);

      await setDoc(
        doc(db, 'users', credential.user.uid),
        {
          uid: credential.user.uid,
          name: nome,
          email,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          tenantId,
        },
        { merge: true }
      );

      await updateDoc(tokenRef, {
        status: 'UTILIZADO',
        utilizadoEm: Timestamp.fromDate(new Date()),
      });

      await signOut(secondaryAuth);
      await signInWithEmailAndPassword(auth, email, senha);

      setSuccess('Conta criada com sucesso. Redirecionando...');
      router.replace('/');
      router.refresh();
    } catch (err: any) {
      const message = err?.message || 'Erro ao concluir o primeiro acesso.';
      if (message.includes('auth/email-already-in-use')) {
        setError('Este token já foi usado para criar uma conta.');
      } else {
        setError(message);
      }
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
              Informe o token enviado pelo suporte e defina a senha inicial do administrador da nova empresa.
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
