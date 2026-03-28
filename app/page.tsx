"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRightLeft, CarFront, CircleDollarSign, LogIn, ShieldCheck, Wallet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { tenantCollection } from '@/lib/tenant';
import { CashRegister, ParkingSpace, ParkingTicket } from '@/types';
import { money, shortDateTime, todayRange } from '@/utils/format';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [activeTickets, setActiveTickets] = useState<ParkingTicket[]>([]);
  const [todayEntries, setTodayEntries] = useState<ParkingTicket[]>([]);
  const [todayExits, setTodayExits] = useState<ParkingTicket[]>([]);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [openCash, setOpenCash] = useState<CashRegister | null>(null);

  useEffect(() => {
    const { start, end } = todayRange();
    const unsubActive = onSnapshot(query(tenantCollection(db, profile?.tenantId, 'parkingTickets'), where('status', '==', 'ativo')), (snap) => {
      setActiveTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingTicket, 'id'>) })));
    });
    const unsubEntries = onSnapshot(query(tenantCollection(db, profile?.tenantId, 'parkingTickets'), where('entryAt', '>=', start), where('entryAt', '<', end)), (snap) => {
      setTodayEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingTicket, 'id'>) })));
    });
    const unsubExits = onSnapshot(query(tenantCollection(db, profile?.tenantId, 'parkingTickets'), where('status', '==', 'finalizado'), where('exitAt', '>=', start), where('exitAt', '<', end)), (snap) => {
      setTodayExits(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingTicket, 'id'>) })));
    });
    const unsubSpaces = onSnapshot(tenantCollection(db, profile?.tenantId, 'parkingSpaces'), (snap) => {
      setSpaces(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingSpace, 'id'>) })));
    });
    const unsubCash = onSnapshot(query(tenantCollection(db, profile?.tenantId, 'cashRegisters'), where('status', '==', 'aberto')), (snap) => {
      const row = snap.docs[0];
      setOpenCash(row ? { id: row.id, ...(row.data() as Omit<CashRegister, 'id'>) } : null);
    });
    return () => {
      unsubActive();
      unsubEntries();
      unsubExits();
      unsubSpaces();
      unsubCash();
    };
  }, [profile?.tenantId]);

  const revenueToday = useMemo(() => todayExits.reduce((sum, item) => sum + (item.amountCharged || 0), 0), [todayExits]);
  const freeSpaces = spaces.filter((space) => space.status === 'livre').length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Seu Estacionamento Inteligente — visão geral da operação em tempo real"
        actions={
          <>
            <Link href="/entrada" className="primary-button"><LogIn size={16} />Nova Entrada</Link>
            <Link href="/saida" className="secondary-button"><ArrowRightLeft size={16} />Registrar Saída</Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
        <StatCard title="Veículos no Pátio" value={`${activeTickets.length}${spaces.length ? `/${spaces.length}` : ''}`} icon={<CarFront size={20} />} hint={spaces.length ? `${freeSpaces} vagas disponíveis` : 'Nenhuma vaga cadastrada'} />
        <StatCard title="Entradas Hoje" value={String(todayEntries.length)} icon={<LogIn size={20} />} tone="green" />
        <StatCard title="Saídas Hoje" value={String(todayExits.length)} icon={<ArrowRightLeft size={20} />} tone="red" />
        {profile?.role === 'admin' ? <StatCard title="Faturamento Hoje" value={money(revenueToday)} icon={<CircleDollarSign size={20} />} tone="blue" hint={openCash ? `Caixa aberto por ${openCash.operatorName}` : 'Nenhum caixa aberto'} /> : <StatCard title="Status do Caixa" value={openCash ? 'Aberto' : 'Fechado'} icon={<Wallet size={20} />} tone="slate" hint={openCash ? `Operador ${openCash.operatorName}` : 'Abra o caixa para operar'} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="panel-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Veículos no pátio</h2>
              <p className="text-sm text-slate-500">Acompanhamento dos tickets em aberto</p>
            </div>
          </div>
          {activeTickets.length ? (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Vaga</th>
                    <th>Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.shortTicket}</td>
                      <td>{ticket.plate || '-'}</td>
                      <td>{ticket.vehicleType}</td>
                      <td>{ticket.parkingSpaceCode || '-'}</td>
                      <td>{shortDateTime(ticket.entryAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state min-h-[320px]">
              <div className="icon-soft-blue"><CarFront size={26} /></div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhum veículo estacionado no momento.</h3>
              <p className="mt-2 text-sm text-slate-500">Quando houver entradas ativas, elas aparecerão aqui.</p>
            </div>
          )}
        </div>

        <div className="panel-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Status operacional</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="icon-soft-green"><ShieldCheck size={18} /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Caixa</p>
                  <p className="text-sm text-slate-500">{openCash ? `Aberto por ${openCash.operatorName}` : 'Fechado no momento'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Ocupação por tipo</p>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                {['CARRO', 'MOTO', 'CAMINHONETE', 'CAMINHAO'].map((type) => (
                  <div className="flex items-center justify-between" key={type}>
                    <span>{type}</span>
                    <span className="font-semibold text-slate-900">{activeTickets.filter((item) => item.vehicleType === type).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
