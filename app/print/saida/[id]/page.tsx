'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { formatDurationMinutes, money, shortDateTime } from '@/utils/format';

const vehicleLabel = (type: ParkingTicket['vehicleType']) =>
  type === 'CAMINHAO' ? 'Caminhão' : type === 'CAMINHONETE' ? 'Caminhonete' : type === 'MOTO' ? 'Moto' : 'Carro';

const RawbtToolbar = ({ onPrint }: { onPrint: () => void }) => (
  <div className="rawbt-toolbar">
    <div>
      <strong>Modo Android / RAWBT</strong>
      <p>Use imprimir para enviar o cupom à bobina térmica.</p>
    </div>
    <div className="rawbt-actions">
      <button type="button" onClick={onPrint}>Imprimir</button>
    </div>
  </div>
);

export default function PrintSaidaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const returnTo = searchParams.get('returnTo');
  
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  const startedRef = useRef(false);
  const blurredRef = useRef(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const saidaPath = returnTo || '/saida';
    const goToSaida = () => {
      window.location.replace(saidaPath);
    };
    const syncOpenerToSaida = () => {
      if (!window.opener) return false;
      try {
        window.opener.location.replace(saidaPath);
        window.opener.focus?.();
        return true;
      } catch (_) {
        return false;
      }
    };

    if (/Android/i.test(navigator.userAgent)) {
      goToSaida();
      return;
    }

    if (syncOpenerToSaida()) {
      try { window.close(); } catch (_) {}
      setTimeout(() => {
        if (!window.closed) goToSaida();
      }, 300);
      return;
    }

    goToSaida();
  };

  function handlePrintClick() {
    window.print();
  }



  useEffect(() => {
    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(tenantDoc(db, tenantId, 'parkingTickets', params.id)),
        getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
      ]);
      if (ticketSnap.exists()) setTicket({ id: ticketSnap.id, ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>) });
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as EstablishmentSettings);
      setLoaded(true);
    }
    load();
  }, [params.id, tenantId]);

  useEffect(() => {
    if (!autoPrint || !loaded || !ticket || startedRef.current) return;

    const handleAfterPrint = () => finish();
    const handleBlur = () => { blurredRef.current = true; };
    const handleFocus = () => { if (startedRef.current && blurredRef.current) setTimeout(finish, 400); };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const timer = setTimeout(() => {
      startedRef.current = true;
      window.print();
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [autoPrint, loaded, ticket]);

  const is58 = (settings?.printerWidth || '80mm') === '58mm';
  const styles = useMemo(() => ({
    pageWidth: is58 ? '58mm' : '80mm',
    padding: is58 ? '2.6mm 2mm 2.8mm' : '4mm 3.5mm 3mm',
    companyFont: is58 ? '5.5mm' : '5.6mm',
    companySub: is58 ? '3.1mm' : '2.9mm',
    metaFont: is58 ? '2.8mm' : '2.8mm',
    subtitle: is58 ? '4.4mm' : '4.3mm',
    rowFont: is58 ? '3.85mm' : '4.3mm',
    footerFont: is58 ? '2.65mm' : '2.6mm',
    sectionGap: is58 ? '4mm' : '3mm',
    rowGap: is58 ? '2.2mm' : '1.45mm',
    footerGap: is58 ? '3.2mm' : '1.6mm',
    footerLineGap: is58 ? '1.2mm' : '0.6mm',
    cutHeight: is58 ? '10mm' : '14mm',
  }), [is58]);

  if (!ticket) {
    return (
      <>
        {printMode === 'rawbt' ? <RawbtToolbar onPrint={handlePrintClick} /> : null}
        <div className="print-ticket-page"><div className="print-ticket">Carregando...</div></div>
      </>
    );
  }

  return (
    <>
      {printMode === 'rawbt' ? <RawbtToolbar onPrint={handlePrintClick} /> : null}
      <div className="print-ticket-page">
        <div className="print-ticket">
          <div className="ticket-header">
            <div className="ticket-company">{settings?.name || 'SmartPark'}</div>
            {settings?.address ? <div className="ticket-company-sub">{settings.address}</div> : null}
            {settings?.phone || settings?.document ? (
              <div className="ticket-company-meta">
                {settings?.phone ? <span>Tel: {settings.phone}</span> : null}
                {settings?.document ? <span>CNPJ: {settings.document}</span> : null}
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
            {settings?.ticketFooter ? <p>{settings.ticketFooter}</p> : null}
            <p>Obrigado pela preferência!</p>
          </div>
          <div className="cut-space" />
        </div>
      </div>

      <style jsx global>{`
        .print-ticket-page { display: flex; justify-content: center; padding: 0; background: #eef2f7; min-height: 100vh; }
        .print-ticket { width: ${styles.pageWidth}; background: #fff; color: #111827; padding: ${styles.padding}; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; box-shadow: ${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15, 23, 42, 0.08)'}; }
        .ticket-header { text-align: center; margin-bottom: 2.2mm; }
        .ticket-company { text-align: center; font-size: ${styles.companyFont}; font-weight: 700; line-height: 1.1; margin-bottom: 1.3mm; word-break: break-word; white-space: normal; }
        .ticket-company-sub { font-size: ${styles.companySub}; font-weight: 600; line-height: 1.2; color: #000; margin-bottom: 1mm; }
        .ticket-company-meta { display: flex; justify-content: center; gap: 1.8mm; flex-wrap: wrap; font-size: ${styles.metaFont}; line-height: 1.2; color: #000; font-weight: 600; }
        .ticket-dashed { border-top: 0.35mm dashed #94a3b8; margin: ${styles.sectionGap} 0; }
        .ticket-subtitle { text-align: center; font-size: ${styles.subtitle}; font-weight: 700; color: #000; margin: ${is58 ? '2.4mm 0 3.4mm' : '1.8mm 0 2.7mm'}; }
        .ticket-row { display: flex; justify-content: space-between; align-items: flex-start; gap: ${is58 ? '2.4mm' : '1.8mm'}; margin: ${styles.rowGap} 0; font-size: ${styles.rowFont}; line-height: ${is58 ? '1.42' : '1.3'}; }
        .ticket-row-label { color: #000; font-weight: 600; }
        .ticket-row-value { color: #111827; font-weight: 700; text-align: right; }
        .ticket-footer { text-align: center; font-size: ${styles.footerFont}; line-height: ${is58 ? '1.35' : '1.2'}; color: #000; font-weight: 600; margin-top: ${styles.footerGap}; }
        .ticket-footer p { margin: 0 0 ${styles.footerLineGap}; }
        .cut-space { height: ${styles.cutHeight}; }
        .rawbt-toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #1e293b; color: white; padding: 12px 20px; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .rawbt-toolbar strong { display: block; font-size: 14px; color: #38bdf8; }
        .rawbt-toolbar p { margin: 2px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.3; }
        .rawbt-actions { display: flex; gap: 8px; }
        .rawbt-actions button { background: #38bdf8; color: #0f172a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .rawbt-actions button:active { transform: scale(0.95); opacity: 0.9; }
        @media print {
          .rawbt-toolbar { display: none !important; }
          .print-ticket-page { display: block; background: #fff; min-height: auto; }
          .print-ticket { box-shadow: none; margin: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
