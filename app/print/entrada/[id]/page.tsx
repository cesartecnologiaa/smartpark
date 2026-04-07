'use client';

import { getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
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

export default function PrintEntradaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const returnTo = searchParams.get('returnTo');
  
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [qr, setQr] = useState('');
  const [loaded, setLoaded] = useState(false);
  
  const startedRef = useRef(false);
  const blurredRef = useRef(false);
  const finishedRef = useRef(false);

  const canShare = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '') && typeof navigator.share === 'function';

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
    const hasOpener = typeof window !== 'undefined' && !!window.opener;
    const goBackOrReturn = () => {
      if (canGoBack) {
        window.history.back();
        return;
      }
      if (returnTo) {
        window.location.replace(returnTo);
      }
    };

    if (printMode === 'rawbt' || /Android/i.test(navigator.userAgent)) {
      goBackOrReturn();
      return;
    }

    if (hasOpener) {
      try { window.close(); } catch (_) {}
      setTimeout(() => {
        if (!window.closed) goBackOrReturn();
      }, 300);
      return;
    }

    goBackOrReturn();
  };

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
        const data = { id: ticketSnap.id, ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>) };
        setTicket(data);
        const width = settingsSnap.exists() && (settingsSnap.data() as EstablishmentSettings).printerWidth === '58mm' ? 180 : 220;
        const qrUrl = await QRCode.toDataURL(JSON.stringify({ ticketId: data.id, shortTicket: data.shortTicket, plate: data.plate || '' }), { width, margin: 1 });
        setQr(qrUrl);
      }
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
    padding: is58 ? '2.8mm 2.2mm 5.8mm' : '4mm 3.5mm 3mm',
    companyFont: is58 ? '5.5mm' : '5.6mm',
    companySub: is58 ? '3.1mm' : '2.9mm',
    metaFont: is58 ? '2.8mm' : '2.8mm',
    labelTop: is58 ? '3.2mm' : '3.8mm',
    codeFont: is58 ? '10.2mm' : '12mm',
    subtitle: is58 ? '4.4mm' : '4.3mm',
    rowFont: is58 ? '3.85mm' : '4.3mm',
    footerFont: is58 ? '2.65mm' : '2.6mm',
    sectionGap: is58 ? '4mm' : '3mm',
    rowGap: is58 ? '2.2mm' : '1.45mm',
    footerGap: is58 ? '5.2mm' : '1.6mm',
    footerLineGap: is58 ? '1.8mm' : '0.6mm',
    qrSize: is58 ? '27mm' : '31mm',
    cutHeight: is58 ? '18mm' : '14mm',
  }), [is58]);

  if (!ticket) {
    return (
      <>
        {printMode === 'rawbt' ? <RawbtToolbar onPrint={handlePrintClick} onShare={handleShareClick} canShare={canShare} /> : null}
        <div className="print-ticket-page"><div className="print-ticket">Carregando...</div></div>
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
            {settings?.address ? <div className="ticket-company-sub">{settings.address}</div> : null}
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
          <div className="ticket-qr-wrap">{qr ? <img src={qr} alt="QR Code" className="ticket-qr" /> : null}</div>
          <div className="ticket-dashed" />
          <div className="ticket-row"><span className="ticket-row-label">Entrada:</span><span className="ticket-row-value">{shortDate(ticket.entryAt)}, {shortTime(ticket.entryAt)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Veículo:</span><span className="ticket-row-value">{vehicleLabel(ticket.vehicleType)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Placa:</span><span className="ticket-row-value">{ticket.plate || '-'}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Vaga:</span><span className="ticket-row-value">{ticket.parkingSpaceCode || '-'}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Operador:</span><span className="ticket-row-value">{ticket.entryOperatorName || ticket.cashierName || '-'}</span></div>
          <div className="ticket-dashed" />
          <div className="ticket-footer">
            <p>{settings?.ticketFooter || 'Nao nos responsabilizamos por objetos deixados no veiculo.'}</p>
            <p>Perda do ticket: taxa adicional sera cobrada.</p>
          </div>
          <div className="cut-space" />
        </div>
      </div>

      <style jsx global>{`
        .print-ticket-page { display: flex; justify-content: center; padding: 0; background: #eef2f7; min-height: 100vh; }
        .print-ticket { width: ${styles.pageWidth}; background: #fff; color: #111827; padding: ${styles.padding}; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; overflow: visible; box-shadow: ${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15, 23, 42, 0.08)'}; }
        .ticket-header { text-align: center; margin-bottom: 2.2mm; }
        .ticket-company { text-align: center; font-size: ${styles.companyFont}; font-weight: 700; line-height: 1.1; margin-bottom: 1.3mm; word-break: break-word; white-space: normal; }
        .ticket-company-sub { font-size: ${styles.companySub}; font-weight: 600; line-height: 1.2; color: #000; margin-bottom: 1mm; }
        .ticket-company-meta { display: flex; justify-content: center; gap: 1.8mm; flex-wrap: wrap; font-size: ${styles.metaFont}; line-height: 1.2; color: #000; font-weight: 600; }
        .ticket-dashed { border-top: 0.35mm dashed #94a3b8; margin: ${styles.sectionGap} 0; }
        .ticket-label-top { text-align: center; font-size: ${styles.labelTop}; color: #000; font-weight: 500; margin-bottom: ${is58 ? '2mm' : '1.5mm'}; }
        .ticket-code { text-align: center; font-size: ${styles.codeFont}; font-weight: 700; letter-spacing: 0.3mm; line-height: 1; color: #000; margin-bottom: ${is58 ? '3.3mm' : '2.6mm'}; }
        .ticket-qr-wrap { display: flex; justify-content: center; margin: ${is58 ? '1.8mm 0 3.2mm' : '1mm 0 2.4mm'}; }
        .ticket-qr { width: ${styles.qrSize}; height: ${styles.qrSize}; image-rendering: pixelated; }
        .ticket-row { display: flex; justify-content: space-between; align-items: flex-start; gap: ${is58 ? '2.4mm' : '1.8mm'}; margin: ${styles.rowGap} 0; font-size: ${styles.rowFont}; line-height: ${is58 ? '1.42' : '1.3'}; }
        .ticket-row-label { color: #000; font-weight: 600; }
        .ticket-row-value { color: #111827; font-weight: 700; text-align: right; }
        .ticket-footer { text-align: center; font-size: ${styles.footerFont}; line-height: ${is58 ? '1.45' : '1.2'}; color: #000; font-weight: 600; margin-top: ${styles.footerGap}; padding-bottom: ${is58 ? '2.8mm' : '0'}; }
        .ticket-footer p { margin: 0 0 ${styles.footerLineGap}; }
        .cut-space { height: ${styles.cutHeight}; min-height: ${styles.cutHeight}; }
        .rawbt-toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #1e293b; color: white; padding: 12px 20px; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .rawbt-toolbar strong { display: block; font-size: 14px; color: #38bdf8; }
        .rawbt-toolbar p { margin: 2px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.3; }
        .rawbt-actions { display: flex; gap: 8px; }
        .rawbt-actions button { background: #38bdf8; color: #0f172a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .rawbt-actions button:active { transform: scale(0.95); opacity: 0.9; }
        @page { size: ${styles.pageWidth} auto; margin: 0; }
        @media print {
          .rawbt-toolbar { display: none !important; }
          .print-ticket-page { display: block; background: #fff; min-height: auto; padding-bottom: 0 !important; }
          .print-ticket { box-shadow: none; margin: 0; width: 100%; overflow: visible; page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </>
  );
}
