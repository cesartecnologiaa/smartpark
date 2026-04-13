'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { PencilLine, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { tenantCollection, tenantDoc } from '@/lib/tenant';
import { CashRegister, ParkingTicket } from '@/types';
import { money, shortDateTime } from '@/utils/format';
import { buildCashTicketRevenueMap, getCashDisplayedBalance, getCashDisplayedTotalRevenue, getTicketOfficialAmount } from '@/utils/financial';

type TicketRow = ParkingTicket;
type CashRow = CashRegister;

function toIsoValue(value?: string) {
  return value || '';
}

function sortTickets(items: TicketRow[]) {
  return [...items].sort((a, b) => toIsoValue(b.exitAt || b.entryAt).localeCompare(toIsoValue(a.exitAt || a.entryAt)));
}

function sortCash(items: CashRow[]) {
  return [...items].sort((a, b) => toIsoValue(b.openedAt).localeCompare(toIsoValue(a.openedAt)));
}

export default function AdminToolsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
  const [newValue, setNewValue] = useState('');
  const [manualCashValue, setManualCashValue] = useState('');

  async function loadData() {
    if (!profile?.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [ticketSnap, cashSnap] = await Promise.all([
        getDocs(tenantCollection(db, profile.tenantId, 'parkingTickets')),
        getDocs(tenantCollection(db, profile.tenantId, 'cashRegisters')),
      ]);
      const loadedTickets = ticketSnap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<TicketRow, 'id'>) }));
      const loadedCash = cashSnap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<CashRow, 'id'>) }));
      setTickets(sortTickets(loadedTickets));
      setCashRegisters(sortCash(loadedCash));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os dados administrativos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile?.tenantId]);

  const filteredTickets = useMemo(() => {
    const term = searchCode.trim().toUpperCase();
    if (!term) return tickets;
    return tickets.filter((ticket) => [ticket.shortTicket, ticket.plate, ticket.id, ticket.status].filter(Boolean).join(' ').toUpperCase().includes(term));
  }, [searchCode, tickets]);

  const ticketRevenueMap = useMemo(() => buildCashTicketRevenueMap(tickets), [tickets]);
  const relatedCash = useMemo(() => editingTicket?.closedCashRegisterId ? cashRegisters.find((cash) => cash.id === editingTicket.closedCashRegisterId) || null : null, [cashRegisters, editingTicket]);

  function openEditor(ticket: TicketRow) {
    setEditingTicket(ticket);
    setNewValue(String(getTicketOfficialAmount(ticket)));
    setManualCashValue('');
    setMessage('');
    setError('');
  }

  function closeEditor() {
    setEditingTicket(null);
    setNewValue('');
    setManualCashValue('');
  }

  async function recalculateCash(cashId: string) {
    if (!profile?.tenantId) return;
    const freshSnap = await getDocs(tenantCollection(db, profile.tenantId, 'parkingTickets'));
    const freshTickets = freshSnap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<TicketRow, 'id'>) }));
    const total = buildCashTicketRevenueMap(freshTickets as TicketRow[])[cashId] || 0;
    await updateDoc(tenantDoc(db, profile.tenantId, 'cashRegisters', cashId), { revenueByTickets: Number(total.toFixed(2)) });
  }

  async function handleDeleteTicket(ticket: TicketRow) {
    if (!profile?.tenantId) return;
    if (!window.confirm(`Excluir o ticket ${ticket.shortTicket}? Esta ação não pode ser desfeita.`)) return;
    setSavingId(ticket.id);
    setError('');
    setMessage('');
    try {
      await deleteDoc(tenantDoc(db, profile.tenantId, 'parkingTickets', ticket.id));
      if (ticket.closedCashRegisterId) await recalculateCash(ticket.closedCashRegisterId);
      setMessage(`Ticket ${ticket.shortTicket} excluído com sucesso.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir o ticket.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteCash(cash: CashRow) {
    if (!profile?.tenantId) return;
    if (!window.confirm(`Excluir o caixa ${cash.id}? Esta ação não pode ser desfeita.`)) return;
    setSavingId(cash.id);
    setError('');
    setMessage('');
    try {
      await deleteDoc(tenantDoc(db, profile.tenantId, 'cashRegisters', cash.id));
      setMessage(`Caixa ${cash.id} excluído com sucesso.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir o caixa.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveTicketValue() {
    if (!profile?.tenantId || !editingTicket) return;
    const parsedNewValue = Number(String(newValue).replace(',', '.'));
    if (!Number.isFinite(parsedNewValue) || parsedNewValue < 0) {
      setError('Informe um valor válido para o ticket.');
      return;
    }
    setSavingId(editingTicket.id);
    setError('');
    setMessage('');
    try {
      await updateDoc(tenantDoc(db, profile.tenantId, 'parkingTickets', editingTicket.id), { amountCharged: parsedNewValue });
      if (editingTicket.closedCashRegisterId) await recalculateCash(editingTicket.closedCashRegisterId);
      setMessage(`Valor do ticket ${editingTicket.shortTicket} atualizado com sucesso.`);
      closeEditor();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o valor do ticket.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveCashOnly() {
    if (!profile?.tenantId || !relatedCash) return;
    const parsedValue = Number(String(manualCashValue).replace(',', '.'));
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError('Informe um valor válido para o caixa.');
      return;
    }
    setSavingId(relatedCash.id);
    setError('');
    setMessage('');
    try {
      await updateDoc(tenantDoc(db, profile.tenantId, 'cashRegisters', relatedCash.id), { revenueByTickets: Number(parsedValue.toFixed(2)) });
      setMessage(`Caixa ${relatedCash.id} ajustado com sucesso.`);
      closeEditor();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar o caixa.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <RoleGuard roles={['admin']}>
      <div className="min-w-0 overflow-x-hidden">
        <PageHeader
          title="Admin Tools"
          subtitle="Ticket é a fonte oficial. Ajustes aqui recalculam o caixa vinculado para manter dashboard, relatórios e fechamento consistentes."
          actions={<button className="secondary-button w-full sm:w-auto" onClick={loadData}><RefreshCw size={16} />Atualizar</button>}
        />

        <div className="panel-card mb-6 p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="app-input pl-11" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="Pesquisar ticket pelo código, placa, ID ou status" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{filteredTickets.length} ticket(s) encontrado(s)</div>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
          <div className="panel-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Tickets</h2>
            {loading ? <p className="mt-4 text-sm text-slate-500">Carregando...</p> : (
              <div className="mt-4 space-y-3">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ticket.shortTicket}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ticket.plate || '-'}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ticket.status}</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p><strong className="text-slate-900">Entrada:</strong> {shortDateTime(ticket.entryAt)}</p>
                          <p><strong className="text-slate-900">Saída:</strong> {shortDateTime(ticket.exitAt)}</p>
                          <p><strong className="text-slate-900">Tipo:</strong> {ticket.vehicleType}</p>
                          <p><strong className="text-slate-900">Valor oficial:</strong> {money(getTicketOfficialAmount(ticket))}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="secondary-button" type="button" onClick={() => openEditor(ticket)}><PencilLine size={16} />Alterar valor</button>
                        <button className="secondary-button" type="button" onClick={() => handleDeleteTicket(ticket)} disabled={savingId === ticket.id}><Trash2 size={16} />Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
                {!filteredTickets.length ? <p className="text-sm text-slate-500">Nenhum ticket encontrado.</p> : null}
              </div>
            )}
          </div>

          <div className="panel-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Caixas</h2>
            {loading ? <p className="mt-4 text-sm text-slate-500">Carregando...</p> : (
              <div className="mt-4 space-y-3">
                {cashRegisters.map((cash) => {
                  const sangrias = cash.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  return (
                    <div key={cash.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{cash.operatorName}</p>
                          <p className="mt-1 text-xs text-slate-500">{shortDateTime(cash.openedAt)}</p>
                        </div>
                        <button className="secondary-button" type="button" onClick={() => handleDeleteCash(cash)} disabled={savingId === cash.id}><Trash2 size={16} />Excluir</button>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p><Wallet className="mr-2 inline-block h-4 w-4" />Faturamento recalculado: <strong className="text-slate-900">{money(getCashDisplayedTotalRevenue(cash, ticketRevenueMap))}</strong></p>
                        <p>Sangrias: <strong className="text-slate-900">{money(sangrias)}</strong></p>
                        <p>Saldo final: <strong className="text-slate-900">{money(getCashDisplayedBalance(cash, ticketRevenueMap))}</strong></p>
                      </div>
                    </div>
                  );
                })}
                {!cashRegisters.length ? <p className="text-sm text-slate-500">Nenhum caixa encontrado.</p> : null}
              </div>
            )}
          </div>
        </div>

        {editingTicket ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Ajustar ticket</h3>
              <p className="mt-1 text-sm text-slate-500">Ticket {editingTicket.shortTicket} • Placa {editingTicket.plate || '-'}</p>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Novo valor oficial do ticket</label>
                  <input className="app-input" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                </div>
                {relatedCash ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Ajustar só o caixa vinculado (opcional)</label>
                    <input className="app-input" value={manualCashValue} onChange={(e) => setManualCashValue(e.target.value)} placeholder="Valor de revenueByTickets" />
                  </div>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button className="secondary-button" type="button" onClick={closeEditor}>Cancelar</button>
                {relatedCash ? <button className="secondary-button" type="button" onClick={handleSaveCashOnly}>Ajustar só o caixa</button> : null}
                <button className="primary-button" type="button" onClick={handleSaveTicketValue}>Salvar ticket e recalcular caixa</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
