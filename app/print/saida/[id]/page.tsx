'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { formatDurationMinutes, money, shortDateTime } from '@/utils/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const vehicleLabel = (type: ParkingTicket['vehicleType']) =>
  type === 'CAMINHAO'
    ? 'Caminhão'
    : type === 'CAMINHONETE'
    ? 'Caminhonete'
    : type === 'MOTO'
    ? 'Moto'
    : 'Carro';

function isAndroid() {
  return typeof window !== 'undefined' && /Android/i.test(window.navigator.userAgent || '');
}

export default function PrintSaidaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const returnTo = searchParams.get('returnTo');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') === '1';
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [readyToPrint, setReadyToPrint] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const hasNavigatedRef = useRef(false);

  const isRawbtAndroid = printMode === 'rawbt' && isAndroid();
  const is58 = (settings?.printerWidth || '80mm') === '58mm';

  const styles = useMemo(
    () => ({
      previewWidth: is58 ? '260px' : '360px',
      printWidth: is58 ? '58mm' : '80mm',
      padding: is58 ? '2.5mm 2.2mm 2.8mm' : '4mm 3.5mm 3.5mm',
      companyFont: is58 ? '18px' : '22px',
      companySub: is58 ? '11px' : '13px',
      metaFont: is58 ? '10px' : '12px',
      subtitle: is58 ? '14px' : '16px',
      rowFont: is58 ? '12px' : '14px',
      footerFont: is58 ? '10px' : '12px',
      cutHeight: is58 ? '20px' : '28px',
    }),
    [is58]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(tenantDoc(db, tenantId, 'parkingTickets', params.id)),
        getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
      ]);

      if (!active) return;

      if (ticketSnap.exists()) {
        setTicket({
          id: ticketSnap.id,
          ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>),
        });
      }

      setSettings(settingsSnap.exists() ? (settingsSnap.data() as EstablishmentSettings) : null);
    }

    load();
    return () => {
      active = false;
    };
  }, [params.id, tenantId]);

  useEffect(() => {
    if (!ticket || !settings) return;
    const timer = window.setTimeout(() => setReadyToPrint(true), 300);
    return () => window.clearTimeout(timer);
  }, [ticket, settings]);

  useEffect(() => {
    if (!autoPrint || !readyToPrint || isRawbtAndroid) return;
    const timer = window.setTimeout(() => {
      setPrintRequested(true);
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [autoPrint, readyToPrint, isRawbtAndroid]);

  useEffect(() => {
    function goBack() {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      if (returnTo) {
        window.location.replace(returnTo);
      } else {
        window.history.back();
      }
    }

    function handleAfterPrint() {
      if (isRawbtAndroid) return;
      goBack();
    }

    function handleVisibility() {
      if (!printRequested || !isRawbtAndroid) return;
      if (document.visibilityState === 'visible') {
        window.setTimeout(goBack, 180);
      }
    }

    window.addEventListener('afterprint', handleAfterPrint);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [printRequested, returnTo, isRawbtAndroid]);

  function handlePrintClick() {
    setPrintRequested(true);
    window.print();
  }

  if (!ticket || !settings) {
    return (
      <div className="print-shell">
        <div className="print-ticket">
          <div className="print-loading">Preparando cupom...</div>
        </div>
        <style>{buildStyles(styles)}</style>
      </div>
    );
  }

  return (
    <>
      <div className="print-shell">
        {isRawbtAndroid ? (
          <div className="print-actions no-print">
            <button type="button" className="print-button" onClick={handlePrintClick} disabled={!readyToPrint}>
              Imprimir cupom
            </button>
          </div>
        ) : null}

        <div className="print-ticket-page">
          <div className="print-ticket">
            <div className="ticket-header">
              <div className="ticket-company">{settings.name || 'SmartPark'}</div>
              {settings.address ? <div className="ticket-company-sub">{settings.address}</div> : null}
              {settings.phone || settings.document ? (
                <div className="ticket-company-meta">
                  {settings.phone ? <span>Tel: {settings.phone}</span> : null}
                  {settings.document ? <span>CNPJ: {settings.document}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="ticket-dashed" />
            <div className="ticket-subtitle">Comprovante de Saída</div>
            <div className="ticket-row"><span className="ticket-row-label">Ticket:</span><span className="ticket-row-value">{ticket.shortTicket}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Placa:</span><span className="ticket-row-value">{ticket.plate || '-'}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Veículo:</span><span className="ticket-row-value">{vehicleLabel(ticket.vehicleType)}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Entrada:</span><span className="ticket-row-value">{shortDateTime(ticket.entryAt)}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Saída:</span><span className="ticket-row-value">{shortDateTime(ticket.exitAt)}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Permanência:</span><span className="ticket-row-value">{formatDurationMinutes(ticket.durationMinutes)}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Valor:</span><span className="ticket-row-value">{money(ticket.amountCharged || 0)}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Pagamento:</span><span className="ticket-row-value">{ticket.paymentMethod || '-'}</span></div>
            <div className="ticket-row"><span className="ticket-row-label">Operador:</span><span className="ticket-row-value">{ticket.exitOperatorName || ticket.entryOperatorName || ticket.cashierName || '-'}</span></div>

            <div className="ticket-dashed" />
            <div className="ticket-footer">
              {settings.ticketFooter ? <p>{settings.ticketFooter}</p> : null}
              <p>Obrigado pela preferência!</p>
            </div>
            <div className="cut-space" />
          </div>
        </div>
      </div>

      <style>{buildStyles(styles)}</style>
    </>
  );
}

type PrintStyleMap = {
  previewWidth: string;
  printWidth: string;
  padding: string;
  companyFont: string;
  companySub: string;
  metaFont: string;
  subtitle: string;
  rowFont: string;
  footerFont: string;
  cutHeight: string;
};

function buildStyles(styles: PrintStyleMap) {
  return `
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #ffffff;
      overflow-x: hidden;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }

    .print-shell {
      width: 100%;
      background: #ffffff;
      padding: 12px;
      box-sizing: border-box;
    }

    .print-actions {
      width: 100%;
      max-width: ${styles.previewWidth};
      margin: 0 auto 12px;
    }

    .print-button {
      width: 100%;
      border: 0;
      border-radius: 14px;
      background: #0f172a;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 16px;
    }

    .print-button:disabled { opacity: 0.55; }
    .print-ticket-page { display: block; width: 100%; margin: 0; padding: 0; background: #ffffff; }
    .print-ticket { width: 100%; max-width: ${styles.previewWidth}; margin: 0 auto; background: #fff; color: #111827; padding: ${styles.padding}; box-sizing: border-box; }
    .print-loading { text-align: center; padding: 24px 12px; font-size: 14px; }
    .ticket-header { text-align: center; margin-bottom: 10px; }
    .ticket-company { font-size: ${styles.companyFont}; font-weight: 700; line-height: 1.1; margin-bottom: 6px; }
    .ticket-company-sub { font-size: ${styles.companySub}; line-height: 1.35; margin-bottom: 4px; }
    .ticket-company-meta { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; font-size: ${styles.metaFont}; }
    .ticket-dashed { border-top: 1px dashed #94a3b8; margin: 10px 0; }
    .ticket-subtitle { text-align: center; font-size: ${styles.subtitle}; font-weight: 700; margin: 6px 0 12px; }
    .ticket-row { display: flex; justify-content: space-between; gap: 10px; margin: 6px 0; font-size: ${styles.rowFont}; line-height: 1.35; }
    .ticket-row-label { font-weight: 600; }
    .ticket-row-value { font-weight: 700; text-align: right; }
    .ticket-footer { text-align: center; font-size: ${styles.footerFont}; line-height: 1.35; }
    .ticket-footer p { margin: 0 0 4px; }
    .cut-space { height: ${styles.cutHeight}; }

    @media print {
      @page {
        size: ${styles.printWidth} auto;
        margin: 0;
      }

      html, body {
        width: ${styles.printWidth};
        min-height: auto !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      .no-print { display: none !important; }
      .print-shell, .print-ticket-page, .print-ticket {
        width: ${styles.printWidth} !important;
        max-width: ${styles.printWidth} !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .print-ticket {
        padding: ${styles.padding} !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
}
