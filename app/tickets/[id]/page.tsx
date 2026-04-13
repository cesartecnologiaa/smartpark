'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDoc } from 'firebase/firestore';
import { ArrowLeft, MessageCircleMore, Printer, ReceiptText, ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { openPrintPage } from '@/lib/print';
import { tenantDoc } from '@/lib/tenant';
import { ParkingTicket, EstablishmentSettings } from '@/types';
import { money, shortDateTime } from '@/utils/format';
import { buildReceiptWhatsappUrl } from '@/utils/whatsapp';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTicket() {
      if (!profile?.tenantId || !params?.id) return;
      setLoading(true);
      setError('');

      try {
        const [ticketSnap, settingsSnap] = await Promise.all([
          getDoc(tenantDoc(db, profile.tenantId, 'parkingTickets', params.id)),
          getDoc(tenantDoc(db, profile.tenantId, 'settings', 'establishment')),
        ]);

        if (!ticketSnap.exists()) {
          setTicket(null);
          setError('Ticket não encontrado.');
        } else {
          setTicket({ id: ticketSnap.id, ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>) });
        }

        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as EstablishmentSettings);
        }
      } catch (err: any) {
        setError(err?.message || 'Não foi possível carregar o ticket.');
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [params?.id, profile?.tenantId]);

  if (loading) {
    return <div className="empty-state min-h-[360px]"><p className="text-sm text-slate-500">Carregando ticket...</p></div>;
  }

  if (!ticket) {
    return (
      <div className="empty-state min-h-[360px]">
        <div className="icon-soft-red"><ShieldAlert size={28} /></div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Ticket indisponível</h3>
        <p className="mt-2 text-sm text-slate-500">{error || 'Não foi possível localizar esse ticket.'}</p>
        <button className="secondary-button mt-5" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>
    );
  }

  const whatsappUrl = buildReceiptWhatsappUrl(ticket, settings?.name || 'Estacionamento');

  return (
    <div className="min-w-0 overflow-x-hidden">
      <PageHeader
        title={`Ticket ${ticket.shortTicket}`}
        subtitle="Conferência completa do atendimento e do valor cobrado"
        actions={
          <>
            <Link href="/relatorios" className="secondary-button w-full sm:w-auto">
              <ArrowLeft size={16} />
              Voltar aos relatórios
            </Link>
            <button className="secondary-button w-full sm:w-auto" onClick={() => openPrintPage(`/print/saida/${ticket.id}`)}>
              <Printer size={16} />
              Imprimir
            </button>
            <a
              className={`primary-button w-full sm:w-auto ${!whatsappUrl ? 'pointer-events-none opacity-50' : ''}`}
              href={whatsappUrl || '#'}
              target="_blank"
            >
              <MessageCircleMore size={16} />
              WhatsApp
            </a>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)]">
        <section className="panel-card p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="icon-soft-blue"><ReceiptText size={18} /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Dados do ticket</h2>
              <p className="text-sm text-slate-500">Informações registradas na entrada e na saída.</p>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Cupom</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.shortTicket}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Placa</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.plate || '-'}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Tipo</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.vehicleType}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Status</p><p className="mt-1 text-base font-semibold capitalize text-slate-900">{ticket.status}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Entrada</p><p className="mt-1 text-base font-semibold text-slate-900">{shortDateTime(ticket.entryAt)}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Saída</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.exitAt ? shortDateTime(ticket.exitAt) : '-'}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Valor cobrado</p><p className="mt-1 text-base font-semibold text-slate-900">{money(ticket.amountCharged || 0)}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Pagamento</p><p className="mt-1 text-base font-semibold capitalize text-slate-900">{ticket.paymentMethod || '-'}</p></div>
          </div>
        </section>

        <section className="panel-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Operação</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Operador da entrada</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.entryOperatorName || ticket.cashierName || '-'}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Operador da saída</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.exitOperatorName || '-'}</p></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-slate-500">Vaga</p><p className="mt-1 text-base font-semibold text-slate-900">{ticket.parkingSpaceCode || '-'}</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
