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

const RawbtToolbar = ({ onPrint, onShare, canShare }: { onPrint: () => void; onShare: () => void; canShare: boolean }) => (
  <div className="rawbt-toolbar">
    <div>
      <strong>Modo Android / RAWBT</strong>
      <p>Use imprimir para enviar o cupom à bobina térmica. Se preferir, compartilhe o link do cupom com o RAWBT.</p>
    </div>
    <div className="rawbt-actions">
      <button type="button" onClick={onPrint}>Imprimir</button>
      {canShare ? <button type="button" onClick={onShare}>Compartilhar</button> : null}
    </div>
  </div>
);

export default function PrintSaidaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);


  const canShare = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '') && typeof navigator.share === 'function';

  function handlePrintClick() {
    window.print();
  }

  async function handleShareClick() {
    if (!canShare) return;

    try {
      await navigator.share({
        title: 'Cupom SmartPark',
        text: 'Abrir cupom SmartPark no RAWBT',
        url: window.location.href,
      });
    } catch (error) {
      const shareError = error as { name?: string } | undefined;
      if (shareError?.name !== 'AbortError') {
        handlePrintClick();
      }
    }
  }

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

      if (autoPrint) {
        setTimeout(() => window.print(), 350);
        window.onafterprint = () => window.close();
      }
    }

    load();
  }, [autoPrint, params.id, tenantId]);

  const is58 = (settings?.printerWidth || '80mm') === '58mm';

  const styles = useMemo(
    () => ({
      pageWidth: is58 ? '58mm' : '80mm',
      padding: is58 ? '1.4mm 1.15mm 1.5mm' : '4mm 3.5mm 3mm',
      companyFont: is58 ? '3.45mm' : '5.6mm',
      companySub: is58 ? '1.85mm' : '2.9mm',
      metaFont: is58 ? '1.72mm' : '2.8mm',
      subtitle: is58 ? '2.75mm' : '4.3mm',
      rowFont: is58 ? '2.32mm' : '4.3mm',
      footerFont: is58 ? '1.68mm' : '2.6mm',
      cutHeight: is58 ? '6mm' : '14mm',
    }),
    [is58]
  );

  if (!ticket) {
    return (
      <>
        {printMode === 'rawbt' ? <RawbtToolbar onPrint={handlePrintClick} onShare={handleShareClick} canShare={canShare} /> : null}
        <div className="print-ticket-page">
        <div className="print-ticket">Carregando...</div>
      </div>
      </>
    );
  }

  return (
    <>
      {printMode === 'rawbt' ? <RawbtToolbar onPrint={handlePrintClick} onShare={handleShareClick} canShare={canShare} /> : null}
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
          padding: 0;
          background: #eef2f7;
          min-height: 100vh;
        }

        .print-ticket {
          width: ${styles.pageWidth};
          background: #fff;
          color: #111827;
          padding: ${styles.padding};
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          box-shadow: ${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15, 23, 42, 0.08)'};
        }

        .ticket-header {
          text-align: center;
          margin-bottom: 2.2mm;
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
          gap: 2mm;
          margin: 1.2mm 0;
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
          margin-top: 1.2mm;
        }

        .ticket-footer p {
          margin: 0 0 0.6mm;
        }

        .cut-space {
          height: ${styles.cutHeight};
        }

        .rawbt-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          background: #e2e8f0;
          border-bottom: 1px solid #cbd5e1;
          font-family: Arial, Helvetica, sans-serif;
        }

        .rawbt-toolbar strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
        }

        .rawbt-toolbar p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 12px;
        }

        .rawbt-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .rawbt-actions button {
          appearance: none;
          border: 0;
          border-radius: 10px;
          background: #0f172a;
          color: #fff;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 600;
        }


        .ticket-header,
        .ticket-dashed,
        .ticket-footer,
        .ticket-row,
        .ticket-qr-wrap {
          width: 100%;
          box-sizing: border-box;
        }

        .ticket-row-label {
          flex: 0 0 auto;
          max-width: 40%;
        }

        .ticket-row-value {
          flex: 1 1 auto;
          word-break: break-word;
        }

        @media (max-width: 640px) {
          .print-ticket-page {
            padding: 0;
            background: #fff;
          }

          .print-ticket {
            width: ${styles.pageWidth};
            min-width: ${styles.pageWidth};
            max-width: ${styles.pageWidth};
            box-shadow: none;
            margin: 0 auto;
          }

          .rawbt-toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
          }
        }

        @media print {
          .rawbt-toolbar {
            display: none;
          }

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
            width: ${styles.pageWidth} !important;
            min-width: ${styles.pageWidth};
            max-width: ${styles.pageWidth};
            box-shadow: none;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}