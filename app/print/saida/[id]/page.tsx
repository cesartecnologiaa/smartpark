'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
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
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);

  useEffect(() => {
    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(tenantDoc(db, tenantId, 'parkingTickets', params.id)),
        getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
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
  }, [params.id, tenantId]);

  const is58 = (settings?.printerWidth || '80mm') === '58mm';

  const styles = useMemo(
    () => ({
      pageWidth: is58 ? '58mm' : '80mm',
      padding: is58 ? '3mm 2.5mm 2.5mm' : '4mm 3.5mm 3mm',
      companyFont: is58 ? '4.3mm' : '5.6mm',
      companySub: is58 ? '2.35mm' : '2.9mm',
      metaFont: is58 ? '2.2mm' : '2.8mm',
      subtitle: is58 ? '3.5mm' : '4.3mm',
      rowFont: is58 ? '3.3mm' : '4.3mm',
      footerFont: is58 ? '2.2mm' : '2.6mm',
      cutHeight: is58 ? '10mm' : '14mm',
    }),
    [is58]
  );

  if (!ticket) {
    return (
      <div className="print-ticket-page">
        <div className="print-ticket">Carregando...</div>
      </div>
    );
  }

  return (
    <>
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

      <style jsx global>{`
        .print-ticket-page {
          display: flex;
          justify-content: center;
          padding: 12px;
          background: #f3f4f6;
          min-height: 100vh;
        }

        .print-ticket {
          width: ${styles.pageWidth};
          background: #fff;
          color: #111827;
          padding: ${styles.padding};
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          box-shadow: 0 0 0 1px #e5e7eb, 0 12px 30px rgba(15, 23, 42, 0.1);
        }

        .ticket-header {
          text-align: center;
          margin-bottom: 3mm;
        }

        .ticket-company {
          text-align: center;
          font-size: ${styles.companyFont};
          font-weight: 600;
          line-height: 1.15;
          margin-bottom: 1.2mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ticket-company-sub {
          font-size: ${styles.companySub};
          font-weight: 500;
          line-height: 1.25;
          color: #000;
          margin-bottom: 0.8mm;
        }

        .ticket-company-meta {
          display: flex;
          justify-content: center;
          gap: 2.2mm;
          flex-wrap: wrap;
          font-size: ${styles.metaFont};
          line-height: 1.2;
          color: #000;
          font-weight: 500;
        }

        .ticket-dashed {
          border-top: 0.35mm dashed #94a3b8;
          margin: 3mm 0;
        }

        .ticket-subtitle {
          text-align: center;
          font-size: ${styles.subtitle};
          font-weight: 600;
          color: #000;
          margin: 1.5mm 0 2.5mm;
        }

        .ticket-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 3mm;
          margin: 1.6mm 0;
          font-size: ${styles.rowFont};
          line-height: 1.35;
        }

        .ticket-row-label {
          color: #000;
          font-weight: 500;
        }

        .ticket-row-value {
          color: #111827;
          font-weight: 600;
          text-align: right;
        }

        .ticket-footer {
          text-align: center;
          font-size: ${styles.footerFont};
          line-height: 1.2;
          color: #000;
          font-weight: 500;
          margin-top: 1.8mm;
        }

        .ticket-footer p {
          margin: 0 0 0.6mm;
        }

        .cut-space {
          height: ${styles.cutHeight};
        }

        @media print {
          @page {
            size: ${styles.pageWidth} auto;
            margin: 0;
          }

          html,
          body {
            width: ${styles.pageWidth};
            margin: 0;
            padding: 0;
            background: #fff;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-ticket-page {
            display: block;
            min-height: auto;
            padding: 0;
            background: #fff;
          }

          .print-ticket {
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}