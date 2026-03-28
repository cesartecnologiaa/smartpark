"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { BanknoteArrowUp, Plus, Wallet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { tenantCollection, tenantDoc } from '@/lib/tenant';
import { openPrintPage } from '@/lib/print';
import { CashRegister } from '@/types';
import { money, shortDateTime, toInputNumber } from '@/utils/format';

export default function CaixaPage() {
  const { profile } = useAuth();
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [openCash, setOpenCash] = useState<CashRegister | null>(null);
  const [cashRows, setCashRows] = useState<CashRegister[]>([]);
  const [message, setMessage] = useState('');

  const canViewCashHistory = profile?.role === 'admin';

  useEffect(() => {
    let unsubRows: (() => void) | null = null;

    if (profile?.role === 'admin') {
      unsubRows = onSnapshot(tenantCollection(db, profile?.tenantId, 'cashRegisters'), (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CashRegister, 'id'>),
        }));
        items.sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''));
        setCashRows(items);
      });
    } else {
      setCashRows([]);
    }

    if (!profile) {
      return () => {
        if (unsubRows) unsubRows();
      };
    }

    const unsubOpen = onSnapshot(
      query(
        tenantCollection(db, profile?.tenantId, 'cashRegisters'),
        where('status', '==', 'aberto'),
        where('operatorId', '==', profile.id)
      ),
      (snap) => {
        const row = snap.docs[0];
        setOpenCash(row ? { id: row.id, ...(row.data() as Omit<CashRegister, 'id'>) } : null);
      }
    );

    return () => {
      if (unsubRows) unsubRows();
      unsubOpen();
    };
  }, [profile]);

  const withdrawalTotal = useMemo(
    () => openCash?.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0,
    [openCash]
  );

  const partialBalance = openCash
    ? openCash.openingAmount +
      openCash.revenueByTickets +
      openCash.revenueByMonthly -
      withdrawalTotal
    : 0;

  async function handleOpen(event: FormEvent) {
    event.preventDefault();
    if (!profile || openCash) return;

    const existingOpenCash = await getDocs(
      query(
        tenantCollection(db, profile?.tenantId, 'cashRegisters'),
        where('status', '==', 'aberto'),
        where('operatorId', '==', profile.id)
      )
    );

    if (!existingOpenCash.empty) {
      setMessage('Já existe um caixa aberto para este operador.');
      setShowOpenForm(false);
      return;
    }

    await addDoc(tenantCollection(db, profile?.tenantId, 'cashRegisters'), {
      operatorId: profile.id,
      operatorName: profile.name,
      openedAt: new Date().toISOString(),
      openingAmount: toInputNumber(openingAmount),
      withdrawals: [],
      revenueByTickets: 0,
      revenueByMonthly: 0,
      status: 'aberto',
    });

    setShowOpenForm(false);
    setOpeningAmount('0');
    setMessage('');
  }

  async function handleWithdraw(event: FormEvent) {
    event.preventDefault();
    if (!openCash) return;

    await updateDoc(tenantDoc(db, profile?.tenantId, 'cashRegisters', openCash.id), {
      withdrawals: [
        ...(openCash.withdrawals || []),
        {
          amount: toInputNumber(withdrawAmount),
          reason: withdrawReason,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    setWithdrawAmount('');
    setWithdrawReason('');
    setShowWithdrawForm(false);
  }

  async function handleCloseCash() {
    if (!openCash) return;

    const closedAt = new Date().toISOString();
    await updateDoc(tenantDoc(db, profile?.tenantId, 'cashRegisters', openCash.id), {
      status: 'fechado',
      closedAt,
    });

    openPrintPage(`/print/caixa/${openCash.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Caixa"
        subtitle="Controle de abertura e fechamento de caixa"
        actions={
          !openCash ? (
            <button
              className="primary-button"
              onClick={() => setShowOpenForm((v) => !v)}
            >
              <Plus size={16} />
              Abrir Caixa
            </button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                className="secondary-button"
                onClick={() => setShowWithdrawForm((v) => !v)}
              >
                <BanknoteArrowUp size={16} />
                Sangria
              </button>
              <button className="primary-button" onClick={handleCloseCash}>
                <Wallet size={16} />
                Fechar Caixa
              </button>
            </div>
          )
        }
      />

      {showOpenForm && !openCash ? (
        <div className="panel-card mb-6 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Abrir Caixa</h2>
          <form className="mt-4 flex flex-wrap gap-3" onSubmit={handleOpen}>
            <input
              className="app-input max-w-sm"
              placeholder="Valor Inicial (R$)"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
            <button className="primary-button">Abrir Caixa</button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowOpenForm(false)}
            >
              Cancelar
            </button>
          </form>
        </div>
      ) : null}

      {openCash ? (
        <div className="mb-6 panel-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Caixa Atual</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Operador</p>
              <p className="mt-2 font-semibold text-slate-900">{openCash.operatorName}</p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Abertura</p>
              <p className="mt-2 font-semibold text-slate-900">
                {shortDateTime(openCash.openedAt)}
              </p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Valor Inicial</p>
              <p className="mt-2 font-semibold text-slate-900">
                {money(openCash.openingAmount)}
              </p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Faturamento</p>
              <p className="mt-2 font-semibold text-slate-900">
                {money(openCash.revenueByTickets + openCash.revenueByMonthly)}
              </p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Saldo Parcial</p>
              <p className="mt-2 font-semibold text-slate-900">
                {money(partialBalance)}
              </p>
            </div>
          </div>

          {showWithdrawForm ? (
            <form
              className="mt-5 grid gap-3 md:grid-cols-[1fr,1fr,auto,auto]"
              onSubmit={handleWithdraw}
            >
              <input
                className="app-input"
                placeholder="Valor da Sangria (R$)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
              <input
                className="app-input"
                placeholder="Motivo"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                required
              />
              <button className="primary-button" type="submit">
                Confirmar Sangria
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowWithdrawForm(false)}
              >
                Cancelar
              </button>
            </form>
          ) : null}

          {!!openCash.withdrawals?.length && (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Histórico de sangrias do caixa atual
              </h3>

              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {openCash.withdrawals.map((item, index) => (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className="flex items-center justify-between rounded-2xl bg-white px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.reason}</p>
                      <p className="text-xs text-slate-500">
                        {shortDateTime(item.createdAt)}
                      </p>
                    </div>
                    <strong className="text-rose-700">{money(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {message ? <p className="mb-4 text-sm text-blue-700">{message}</p> : null}

      {canViewCashHistory ? (
        <div className="panel-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Histórico de caixas</h2>
          <div className="table-shell mt-4">
            <table>
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th>V. Inicial</th>
                  <th>Faturamento</th>
                  <th>Sangrias</th>
                  <th>V. Final</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cashRows.length ? (
                  cashRows.map((row) => {
                    const sangrias =
                      row.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0;

                    const finalValue =
                      row.openingAmount +
                      row.revenueByTickets +
                      row.revenueByMonthly -
                      sangrias;

                    return (
                      <tr key={row.id}>
                        <td>{row.operatorName}</td>
                        <td>{shortDateTime(row.openedAt)}</td>
                        <td>{shortDateTime(row.closedAt)}</td>
                        <td>{money(row.openingAmount)}</td>
                        <td>{money(row.revenueByTickets + row.revenueByMonthly)}</td>
                        <td>{money(sangrias)}</td>
                        <td>{money(finalValue)}</td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              row.status === 'aberto'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.status === 'aberto' ? 'Aberto' : 'Fechado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>Nenhum registro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}