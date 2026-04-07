'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { formatDurationMinutes, money, shortDateTime } from '@/utils/format';

const vehicleLabel = (type: ParkingTicket['vehicleType']) =>
  type === 'CAMINHAO'
    ? 'Caminhão'
    : type === 'CAMINHONETE'
    ? 'Caminhonete'
    : type === 'MOTO'
    ? 'Moto'
    : 'Carro';

export default function PrintSaidaPage({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);

  useEffect(() => {
    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(doc(db, 'parkingTickets', params.id)),
        getDoc(doc(db, 'settings', 'establishment')),
      ]);

      if (ticketSnap.exists()) {
        setTicket({
          id: ticketSnap.id,
          ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>),
        });
      }

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as EstablishmentSettings);
      }

      setTimeout(() => window.print(), 350);
      window.onafterprint = () => window.close();
    }

    load();
  }, [params.id]);

  if (!ticket) {
    return (
      <div className="print-ticket-page">
        <div className="print-ticket">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="print-ticket-page">
      <div className="print-ticket">
        <div className="ticket-header">
          <div className="ticket-company">{settings?.name || 'SmartPark'}</div>

          {settings?.address ? (
            <div className="ticket-company-sub">{settings.address}</div>
          ) : null}

          {settings?.phone || settings?.document ? (
            <div className="ticket-company-meta">
              {settings?.phone ? <span>Tel: {settings.phone}</span> : null}
              {settings?.document ? <span>CNPJ: {settings.document}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="ticket-dashed" />

        <div className="ticket-subtitle">Comprovante de Saída</div>

        <div className="ticket-row">
          <span className="ticket-row-label">Ticket:</span>
          <span className="ticket-row-value">{ticket.shortTicket}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Placa:</span>
          <span className="ticket-row-value">{ticket.plate || '-'}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Veículo:</span>
          <span className="ticket-row-value">{vehicleLabel(ticket.vehicleType)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Entrada:</span>
          <span className="ticket-row-value">{shortDateTime(ticket.entryAt)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Saída:</span>
          <span className="ticket-row-value">{shortDateTime(ticket.exitAt)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Permanência:</span>
          <span className="ticket-row-value">{formatDurationMinutes(ticket.durationMinutes)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Valor:</span>
          <span className="ticket-row-value">{money(ticket.amountCharged || 0)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Pagamento:</span>
          <span className="ticket-row-value">{ticket.paymentMethod || '-'}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Operador:</span>
          <span className="ticket-row-value">
            {ticket.exitOperatorName || ticket.entryOperatorName || ticket.cashierName || '-'}
          </span>
        </div>

        <div className="ticket-dashed" />

        <div className="ticket-footer">
          {settings?.ticketFooter ? <p>{settings.ticketFooter}</p> : null}
          <p>Obrigado pela preferência!</p>
        </div>

        <div className="cut-space" />
      </div>
    </div>
  );
}