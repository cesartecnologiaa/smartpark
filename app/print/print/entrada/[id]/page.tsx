'use client';

import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { shortDate, shortTime } from '@/utils/format';

const vehicleLabel = (type: ParkingTicket['vehicleType']) =>
  type === 'CAMINHAO'
    ? 'Caminhão'
    : type === 'CAMINHONETE'
    ? 'Caminhonete'
    : type === 'MOTO'
    ? 'Moto'
    : 'Carro';

export default function PrintEntradaPage({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [qr, setQr] = useState('');

  useEffect(() => {
    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(doc(db, 'parkingTickets', params.id)),
        getDoc(doc(db, 'settings', 'establishment')),
      ]);

      if (ticketSnap.exists()) {
        const data = {
          id: ticketSnap.id,
          ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>),
        };
        setTicket(data);

        const qrUrl = await QRCode.toDataURL(
          JSON.stringify({
            ticketId: data.id,
            shortTicket: data.shortTicket,
            plate: data.plate || '',
          }),
          { width: 220, margin: 1 }
        );

        setQr(qrUrl);
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

        <div className="ticket-label-top">CÓDIGO DO TICKET</div>
        <div className="ticket-code">{ticket.shortTicket}</div>

        <div className="ticket-qr-wrap">
          {qr ? <img src={qr} alt="QR Code" className="ticket-qr" /> : null}
        </div>

        <div className="ticket-dashed" />

        <div className="ticket-row">
          <span className="ticket-row-label">Entrada:</span>
          <span className="ticket-row-value">
            {shortDate(ticket.entryAt)}, {shortTime(ticket.entryAt)}
          </span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Veículo:</span>
          <span className="ticket-row-value">{vehicleLabel(ticket.vehicleType)}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Placa:</span>
          <span className="ticket-row-value">{ticket.plate || '-'}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Vaga:</span>
          <span className="ticket-row-value">{ticket.parkingSpaceCode || '-'}</span>
        </div>

        <div className="ticket-row">
          <span className="ticket-row-label">Operador:</span>
          <span className="ticket-row-value">
            {ticket.entryOperatorName || ticket.cashierName || '-'}
          </span>
        </div>

        <div className="ticket-dashed" />

        <div className="ticket-footer">
          <p>{settings?.ticketFooter || 'Nao nos responsabilizamos por objetos deixados no veiculo.'}</p>
          <p>Perda do ticket: taxa adicional sera cobrada.</p>
        </div>

        <div className="cut-space" />
      </div>
    </div>
  );
}