"use client";

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const publicRoutes = ['/login'];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, profile } = useAuth();

  const isPrintRoute = pathname.startsWith('/print');

  useEffect(() => {
    if (loading) return;
    const isPublic = publicRoutes.includes(pathname) || isPrintRoute;

    if (!profile && !isPublic) {
      router.replace('/login');
      return;
    }

    if (profile && pathname === '/login') {
      router.replace('/');
    }
  }, [isPrintRoute, loading, pathname, profile, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="panel-card px-8 py-6 text-center text-slate-700">Carregando SmartPark...</div>
      </div>
    );
  }

  if (pathname === '/login') return <>{children}</>;
  if (isPrintRoute) return <>{children}</>;

  return (
    <div className="app-shell bg-app">
      <div className="app-shell-inner">
        <Sidebar />

        <div className="app-main-area">
          <main className="app-content">{children}</main>

          <footer className="app-footer">
            <p className="app-footer-main">Desenvolvido por Cesar Soluções em Tecnologia</p>
            <p className="app-footer-sub">SmartPark® 2026 - Todos os Direitos Reservados.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
