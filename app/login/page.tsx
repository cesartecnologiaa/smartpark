"use client";

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-7xl items-center gap-6 xl:grid-cols-[0.96fr,1.04fr]">
        <div className="relative hidden overflow-hidden rounded-[40px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex justify-center">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">
                <Sparkles size={16} className="mr-2" />
                Plataforma profissional para gestão de estacionamento
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="rounded-[22px] bg-white p-2.5 shadow-lg">
                <Image
                  src="/icon-smartpark.svg"
                  alt="SmartPark"
                  width={88}
                  height={88}
                  priority
                  className="h-[88px] w-[88px] object-contain"
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-[24px] font-bold leading-none text-white">
                  SmartPark
                </h1>
                <p className="mt-2 text-sm font-medium text-white/70">
                  Seu Estacionamento Inteligente
                </p>
              </div>
            </div>

            <h2 className="mt-8 max-w-lg text-[30px] font-semibold leading-[1.1]">
              Controle moderno e inteligente para a gestão do seu estacionamento.
            </h2>

            <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/75">
              Gerencie entradas, saídas, mensalistas, vagas, caixa e relatórios em um só lugar,
              com mais agilidade na operação e visual profissional no dia a dia.
            </p>
          </div>

          <div className="relative z-10 mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-3">
                <ShieldCheck size={20} />
              </div>
              <p className="text-sm font-semibold">Acesso seguro</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Controle por perfil de usuário com navegação protegida.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-3">
                <Sparkles size={20} />
              </div>
              <p className="text-sm font-semibold">Operação rápida</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Fluxo pensado para entrada, saída e impressão sem complicação.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-3">
                <ShieldCheck size={20} />
              </div>
              <p className="text-sm font-semibold">Gestão inteligente</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Relatórios, caixa, vagas e mensalistas em um painel central.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="panel-card w-full overflow-hidden rounded-[36px] p-0 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-slate-50/70 px-8 py-6 md:px-10">
              <div className="flex items-center gap-4 xl:hidden">
                <div className="rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-sm">
                  <Image
                    src="/icon-smartpark.svg"
                    alt="SmartPark"
                    width={48}
                    height={48}
                    priority
                    className="h-12 w-12"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-2xl font-bold leading-none text-slate-950">
                    SmartPark
                  </div>
                  <div className="truncate pt-1 text-sm text-slate-500">
                    Seu Estacionamento Inteligente
                  </div>
                </div>
              </div>

              <div className="mt-6 xl:mt-0">
                <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">
                  Entrar no sistema
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use suas credenciais para acessar o painel administrativo do SmartPark.
                </p>
              </div>
            </div>

            <div className="px-8 py-8 md:px-10 md:py-10">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      className="app-input h-14 pl-11"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Digite seu e-mail"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Senha
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      className="app-input h-14 pl-11"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}

                <button className="primary-button h-14 w-full justify-center text-base" disabled={loading}>
                  {loading ? 'Entrando...' : 'Acessar SmartPark'}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                <p className="text-xs leading-5 text-slate-400">
                  Desenvolvido por Cesar Soluções em Tecnologia
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  SmartPark® 2026 - Todos os Direitos Reservados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}