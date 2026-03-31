'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { CarFront, CreditCard, MessageCircleMore, Printer, QrCode, ScanQrCode, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import QrScanner from '@/components/QrScanner';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { openPrintPage } from '@/lib/print';
import { CashRegister, EstablishmentSettings, MonthlyCustomer, ParkingSpace, ParkingTicket, PaymentMethod, PriceSetting } from '@/types';
import { formatDurationMinutes, money, plateMask, shortDateTime } from '@/utils/format';
import { calculateParkingAmount, diffDaysFromNow } from '@/utils/parking';
import { buildReceiptWhatsappUrl } from '@/utils/whatsapp';

type SearchMode = 'qr' | 'codigo' | 'placa';

export default function SaidaPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<SearchMode>('qr');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [monthlyCustomers, setMonthlyCustomers] = useState<MonthlyCustomer[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [preview, setPreview] = useState<{ ticket: ParkingTicket; total: number; minutes: number; monthly: MonthlyCustomer | null; fractions: number; fractionValue: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubTickets = onSnapshot(query(collection(db, 'parkingTickets'), where('status', '==', 'ativo')), (snapshot) => {
      setTickets(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ParkingTicket, 'id'>) })));
    });
    const unsubSpaces = onSnapshot(collection(db, 'parkingSpaces'), (snapshot) => {
      setSpaces(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ParkingSpace, 'id'>) })));
    });
    const unsubPrices = onSnapshot(collection(db, 'priceSettings'), (snapshot) => {
      setPriceSettings(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PriceSetting, 'id'>) })));
    });
    const unsubMonthly = onSnapshot(collection(db, 'monthlyCustomers'), (snapshot) => {
      setMonthlyCustomers(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MonthlyCustomer, 'id'>) })));
    });
    getDoc(doc(db, 'settings', 'establishment')).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as EstablishmentSettings);
    });
    if (!profile) return () => { unsubTickets(); unsubSpaces(); unsubPrices(); unsubMonthly(); };
    const unsubCash = onSnapshot(query(collection(db, 'cashRegisters'), where('status', '==', 'aberto'), where('operatorId', '==', profile.id)), (snapshot) => {
      const row = snapshot.docs[0];
      setOpenCashRegister(row ? { id: row.id, ...(row.data() as Omit<CashRegister, 'id'>) } : null);
    });
    return () => {
      unsubTickets();
      unsubSpaces();
      unsubPrices();
      unsubMonthly();
      unsubCash();
    };
  }, [profile]);

  const results = useMemo(() => {
    if (!search.trim()) return tickets.slice(0, 10);
    const queryText = search.toUpperCase();
    return tickets.filter((item) => {
      if (mode === 'codigo') return item.shortTicket.includes(queryText);
      if (mode === 'placa') return (item.plate || '').includes(queryText);
      return item.shortTicket.includes(queryText) || (item.plate || '').includes(queryText);
    });
  }, [tickets, search, mode]);

  const previewTicket = useCallback((ticket: ParkingTicket) => {
    const monthly = monthlyCustomers.find((item) => item.plate === ticket.plate && item.active);
    const overdueDays = monthly?.endDate ? diffDaysFromNow(monthly.endDate) : 999;
    const isValidMonthly = Boolean(monthly && overdueDays <= 0);
    const calc = calculateParkingAmount(ticket.entryAt, priceSettings.find((item) => item.vehicleType === ticket.vehicleType));
    setPreview({ ticket, total: isValidMonthly ? 0 : calc.total, minutes: calc.minutes, monthly: monthly || null, fractions: calc.fractions || 0, fractionValue: calc.fractionValue || 0 });
    setPaymentMethod(isValidMonthly ? 'mensalista' : 'dinheiro');
    setMessage('');
  }, [monthlyCustomers, priceSettings]);

  const handleQrRead = useCallback((decodedText: string) => {
    try {
      const payload = JSON.parse(decodedText) as { ticketId?: string; shortTicket?: string; plate?: string };
      if (payload.ticketId) {
        const found = tickets.find((item) => item.id === payload.ticketId);
        if (found) return previewTicket(found);
      }
      if (payload.shortTicket) setSearch(payload.shortTicket);
      if (payload.plate) setSearch(payload.plate);
    } catch {
      setSearch(decodedText);
    }
  }, [previewTicket, tickets]);

  async function finalizeExit() {
    if (!preview || !openCashRegister) {
      setMessage('Abra o caixa para concluir a saída.');
      return;
    }
    const finalizedAt = new Date().toISOString();
    const finalizedData = {
      status: 'finalizado' as const,
      exitAt: finalizedAt,
      durationMinutes: preview.minutes,
      amountCharged: preview.total,
      paymentMethod,
      closedCashRegisterId: openCashRegister.id,
    };
    await updateDoc(doc(db, 'parkingTickets', preview.ticket.id), finalizedData);
    if (preview.ticket.parkingSpaceId) {
      await updateDoc(doc(db, 'parkingSpaces', preview.ticket.parkingSpaceId), {
        status: 'livre',
        currentTicketId: null,
        currentVehicleType: null,
        updatedAt: finalizedAt,
      });
    }
    await updateDoc(doc(db, 'cashRegisters', openCashRegister.id), {
      revenueByTickets: (openCashRegister.revenueByTickets || 0) + preview.total,
    });
    const finalTicket = { ...preview.ticket, ...finalizedData };
    setPreview({ ...preview, ticket: finalTicket });
    setMessage('Saída finalizada com sucesso.');
    openPrintPage(`/print/saida/${preview.ticket.id}`);
  }

  const selectedSpace = preview?.ticket.parkingSpaceId ? spaces.find((item) => item.id === preview.ticket.parkingSpaceId) : null;
  const overdueDays = preview?.monthly?.endDate ? diffDaysFromNow(preview.monthly.endDate) : 0;
  const whatsappUrl = preview?.ticket ? buildReceiptWhatsappUrl({ ...preview.ticket, durationMinutes: preview.minutes, amountCharged: preview.total, paymentMethod }, settings?.name || 'Estacionamento') : '';

  return (
    <div>
      <PageHeader title="Registrar Saída" subtitle="Localize o veículo pelo QR Code, código do ticket ou placa" />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { key: 'qr', label: 'Ler QR Code', icon: <ScanQrCode size={20} /> },
          { key: 'codigo', label: 'Digitar Código', icon: <CreditCard size={20} /> },
          { key: 'placa', label: 'Buscar Placa', icon: <CarFront size={20} /> },
        ].map((item) => (
          <button key={item.key} type="button" onClick={() => setMode(item.key as SearchMode)} className={`selection-card ${mode === item.key ? 'selection-card-active' : ''}`}>
            <div className="icon-soft-blue">{item.icon}</div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr),420px]">
        <div className="space-y-6">
          <section className="panel-card overflow-hidden">
            <div className="border-b border-slate-200/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="icon-soft-blue">{mode === 'qr' ? <QrCode size={18} /> : <Search size={18} />}</div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{mode === 'qr' ? 'Leitura de QR Code' : mode === 'codigo' ? 'Busca por código do ticket' : 'Busca por placa'}</h2>
                  <p className="mt-1 text-sm text-slate-500">{mode === 'qr' ? 'Aponte a câmera para o QR do cupom para localizar rapidamente o veículo.' : mode === 'codigo' ? 'Digite o código do ticket para localizar o veículo e calcular a saída.' : 'Informe a placa para localizar o veículo ativo no pátio.'}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {mode === 'qr' ? <QrScanner onRead={handleQrRead} /> : null}
              {mode !== 'qr' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{mode === 'codigo' ? 'Código do ticket' : 'Placa do veículo'}</label>
                  <input className="app-input" value={search} onChange={(e) => setSearch(mode === 'placa' ? plateMask(e.target.value) : e.target.value.toUpperCase())} placeholder={mode === 'codigo' ? 'Ex: 1234' : 'ABC1234'} />
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel-card overflow-hidden">
            <div className="border-b border-slate-200/70 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="icon-soft-blue"><CarFront size={18} /></div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Tickets localizados</h2>
                  <p className="mt-1 text-sm text-slate-500">Selecione um ticket para calcular a permanência, valor e forma de pagamento.</p>
                </div>
              </div>
            </div>
            <div className="p-6 pt-5">
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Placa</th>
                      <th>Tipo</th>
                      <th>Entrada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length ? results.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>{ticket.shortTicket}</td>
                        <td>{ticket.plate || '-'}</td>
                        <td>{ticket.vehicleType}</td>
                        <td>{shortDateTime(ticket.entryAt)}</td>
                        <td><button className="secondary-button py-2" onClick={() => previewTicket(ticket)}>Calcular</button></td>
                      </tr>
                    )) : <tr><td colSpan={5}>Nenhum registro</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <section className="panel-card overflow-hidden h-fit">
          <div className="border-b border-slate-200/70 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="icon-soft-blue"><CreditCard size={18} /></div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Resumo da saída</h2>
                <p className="mt-1 text-sm text-slate-500">Confira o ticket, o tempo de permanência e finalize a cobrança.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {preview ? (
              <div className="space-y-4 text-sm text-slate-600">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-4"><span>Ticket</span><strong className="text-right text-slate-900">{preview.ticket.shortTicket}</strong></div>
                  <div className="mt-2 flex items-center justify-between gap-4"><span>Placa</span><strong className="text-right text-slate-900">{preview.ticket.plate || '-'}</strong></div>
                  <div className="mt-2 flex items-center justify-between gap-4"><span>Tempo</span><strong className="text-right text-slate-900">{formatDurationMinutes(preview.minutes)}</strong></div>
                  <div className="mt-2 flex items-center justify-between gap-4"><span>Vaga</span><strong className="text-right text-slate-900">{selectedSpace?.code || preview.ticket.parkingSpaceCode || '-'}</strong></div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-200 pt-3"><span>Total</span><strong className="text-right text-xl text-slate-900">{money(preview.total)}</strong></div>
                </div>

                {preview.monthly ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${overdueDays > 3 ? 'border-rose-200 bg-rose-50 text-rose-700 danger-pulse' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    Mensalista identificado: {preview.monthly.name}. {overdueDays > 3 ? 'Atraso superior a 3 dias.' : 'Dentro da validade.'}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Forma de pagamento</label>
                  <select className="app-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    {preview.total === 0 ? <option value="mensalista">Mensalista</option> : null}
                  </select>
                </div>
                {!openCashRegister ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Abra o caixa para concluir a saída.</p> : null}
                <button className="primary-button w-full justify-center" disabled={!openCashRegister} onClick={finalizeExit}>Finalizar Saída</button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="secondary-button w-full justify-center" onClick={() => openPrintPage(`/print/saida/${preview.ticket.id}`)}><Printer size={16} />Imprimir Cupom</button>
                  <a className={`secondary-button w-full justify-center ${!whatsappUrl ? 'pointer-events-none opacity-50' : ''}`} href={whatsappUrl || '#'} target="_blank" rel="noreferrer"><MessageCircleMore size={16} />WhatsApp</a>
                </div>
              </div>
            ) : <div className="empty-state min-h-[420px]"><div className="icon-soft-blue"><ScanQrCode size={28} /></div><h3 className="mt-4 text-lg font-semibold text-slate-900">Selecione um ticket para ver o cálculo.</h3><p className="mt-2 text-sm text-slate-500">Busque por QR Code, código ou placa para localizar o veículo.</p></div>}
            {message ? <p className="mt-4 text-sm text-blue-700">{message}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
