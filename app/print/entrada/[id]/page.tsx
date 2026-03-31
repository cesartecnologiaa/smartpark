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

  useEffect(() => {
    async function load() {
      const [ticketSnap, settingsSnap] = await Promise.all([
        getDoc(tenantDoc(db, tenantId, 'parkingTickets', params.id)),
        getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
      ]);

      let nextTicket: ParkingTicket | null = null;
      let nextSettings: EstablishmentSettings | null = null;

      if (ticketSnap.exists()) {
        nextTicket = { id: ticketSnap.id, ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>) };
        setTicket(nextTicket);
      }
      if (settingsSnap.exists()) {
        nextSettings = settingsSnap.data() as EstablishmentSettings;
        setSettings(nextSettings);
      }
      if (nextTicket) {
        const width = nextSettings?.printerWidth === '58mm' ? 160 : 220;
        const qrUrl = await QRCode.toDataURL(
          JSON.stringify({ ticketId: nextTicket.id, shortTicket: nextTicket.shortTicket, plate: nextTicket.plate || '' }),
          { width, margin: 1 }
        );
        setQr(qrUrl);
      }
      setLoaded(true);
    }
    load();
  }, [params.id, tenantId]);

  useEffect(() => {
    document.documentElement.classList.add('print-route-active');
    document.body.classList.add('print-route-active');
    return () => {
      document.documentElement.classList.remove('print-route-active');
      document.body.classList.remove('print-route-active');
    };
  }, []);

  useEffect(() => {
    if (!autoPrint || !loaded || !ticket || startedRef.current) return;

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (printMode === 'rawbt') {
        if (returnTo) window.location.replace(returnTo);
        else window.history.back();
        return;
      }
      // Android: window.close() only works for self-opened windows.
      // Try close, then fall back to history navigation after short delay.
      try { window.close(); } catch (_) {}
      window.setTimeout(() => {
        if (!window.closed) {
          if (returnTo) window.location.replace(returnTo);
          else window.history.back();
        }
      }, 400);
    };

    const handleAfterPrint = () => finish();
    const handleBlur = () => { blurredRef.current = true; };
    // Android fires focus when user returns from print/share dialog
    const handleFocus = () => {
      if (startedRef.current && blurredRef.current) window.setTimeout(finish, 350);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          startedRef.current = true;
          window.print();
        }, 300);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [autoPrint, loaded, printMode, returnTo, ticket]);

  const is58 = (settings?.printerWidth || '80mm') === '58mm';
  const styles = useMemo(() => buildStyles(is58), [is58]);

  if (!ticket || !loaded) {
    return <><div className="print-ticket-page"><div className="print-ticket print-ticket-loading">Preparando cupom...</div></div><style>{basePrintStyles(styles, is58)}</style></>;
  }

  return (
    <>
      <div className="print-ticket-page">
        <div className="print-ticket">
          <div className="ticket-header">
            <div className="ticket-company">{settings?.name || 'SmartPark'}</div>
            {settings?.address ? <div className="ticket-company-sub">{settings.address}</div> : null}
            {settings?.phone || settings?.document ? <div className="ticket-company-meta">{settings?.phone ? <span>Tel: {settings.phone}</span> : null}{settings?.document ? <span>CNPJ: {settings.document}</span> : null}</div> : null}
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
          <div className="ticket-footer"><p>{settings?.ticketFooter || 'Nao nos responsabilizamos por objetos deixados no veiculo.'}</p><p>Perda do ticket: taxa adicional sera cobrada.</p></div>
          <div className="cut-space" />
        </div>
      </div>
      <style>{basePrintStyles(styles, is58)}</style>
    </>
  );
}

// Shared style builder (also exported for saida/caixa pages)
export function buildStyles(is58: boolean) {
  return {
    pageWidthPx: is58 ? '220px' : '302px',
    pageWidthMm: is58 ? '58mm' : '80mm',
    paddingPx: is58 ? '4px 3px 4px' : '11px 10px 8px',
    paddingMm: is58 ? '1.4mm 1.15mm 1.5mm' : '4mm 3.5mm 3mm',
    companyFontPx: is58 ? '10px' : '16px',
    companyFontMm: is58 ? '3.45mm' : '5.6mm',
    companySubPx: is58 ? '7px' : '10px',
    companySubMm: is58 ? '1.85mm' : '2.9mm',
    metaFontPx: is58 ? '6px' : '9px',
    metaFontMm: is58 ? '1.72mm' : '2.8mm',
    labelTopPx: is58 ? '7px' : '12px',
    labelTopMm: is58 ? '2.2mm' : '3.8mm',
    codeFontPx: is58 ? '20px' : '34px',
    codeFontMm: is58 ? '7.1mm' : '12mm',
    subtitlePx: is58 ? '9px' : '13px',
    subtitleMm: is58 ? '2.75mm' : '4.3mm',
    rowFontPx: is58 ? '7px' : '12px',
    rowFontMm: is58 ? '2.32mm' : '4.3mm',
    footerFontPx: is58 ? '6px' : '8px',
    footerFontMm: is58 ? '1.68mm' : '2.6mm',
    qrSizePx: is58 ? '76px' : '117px',
    qrSizeMm: is58 ? '20mm' : '31mm',
    cutHeightPx: is58 ? '22px' : '52px',
    cutHeightMm: is58 ? '6mm' : '14mm',
  };
}

export function basePrintStyles(styles: ReturnType<typeof buildStyles>, is58: boolean) {
  return `
  /* ─── Screen / Android preview (px units) ─── */
  html.print-route-active, body.print-route-active {
    margin:0!important; padding:0!important; background:#fff!important;
    height:auto!important; overflow-x:hidden!important;
    /* FIXED: removed min-height:100% which caused blank space on Android */
  }
  .print-ticket-page {
    /* FIXED: block layout instead of flex; flex caused overflow/blank on Android preview */
    display:block; padding:0; margin:0; background:#fff;
  }
  .print-ticket {
    /* FIXED: px widths for screen; mm widths only in @media print */
    width:${styles.pageWidthPx}; max-width:${styles.pageWidthPx};
    background:#fff; color:#111827;
    padding:${styles.paddingPx};
    box-sizing:border-box; font-family:Arial,Helvetica,sans-serif;
    box-shadow:${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15,23,42,0.08)'};
    margin:0 auto;
  }
  .print-ticket-loading { text-align:center; padding-top:30px; padding-bottom:30px; }
  .ticket-header{text-align:center;margin-bottom:6px;}
  .ticket-company{text-align:center;font-size:${styles.companyFontPx};font-weight:600;line-height:1.15;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ticket-company-sub{font-size:${styles.companySubPx};font-weight:500;line-height:1.25;color:#000;margin-bottom:2px;}
  .ticket-company-meta{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;font-size:${styles.metaFontPx};line-height:1.2;color:#000;font-weight:500;}
  .ticket-dashed{border-top:1px dashed #94a3b8;margin:8px 0;}
  .ticket-label-top{text-align:center;font-size:${styles.labelTopPx};font-weight:700;letter-spacing:.5px;margin-bottom:3px;}
  .ticket-code{text-align:center;font-size:${styles.codeFontPx};font-weight:700;line-height:1;letter-spacing:${is58?'0.5px':'1px'};margin-bottom:5px;}
  .ticket-qr-wrap{display:flex;justify-content:center;margin:3px 0 5px;}
  .ticket-qr{width:${styles.qrSizePx};height:${styles.qrSizePx};image-rendering:pixelated;}
  .ticket-subtitle{text-align:center;font-size:${styles.subtitlePx};font-weight:600;color:#000;margin:4px 0 6px;}
  .ticket-row{display:flex;justify-content:space-between;align-items:flex-start;gap:5px;margin:3px 0;font-size:${styles.rowFontPx};line-height:1.35;}
  .ticket-row-label{color:#000;font-weight:500;}
  .ticket-row-value{color:#111827;font-weight:600;text-align:right;}
  .ticket-footer{text-align:center;font-size:${styles.footerFontPx};line-height:1.2;color:#000;font-weight:500;margin-top:3px;}
  .ticket-footer p{margin:0 0 2px;}
  .cut-space{height:${styles.cutHeightPx};}

  /* ─── @page: set paper width explicitly so Android print dialog respects it ─── */
  @page { size:${styles.pageWidthMm} auto; margin:0; }

  /* ─── Print media: switch to mm units for real paper output ─── */
  @media print {
    html, body {
      background:#fff!important;
      width:${styles.pageWidthMm}!important;
      margin:0!important; padding:0!important;
    }
    .print-ticket-page { display:block!important; }
    .print-ticket {
      width:${styles.pageWidthMm}!important; max-width:${styles.pageWidthMm}!important;
      margin:0!important; box-shadow:none!important;
      break-inside:avoid; page-break-inside:avoid;
      padding:${styles.paddingMm}!important;
    }
    .ticket-company{font-size:${styles.companyFontMm}!important;}
    .ticket-company-sub{font-size:${styles.companySubMm}!important;}
    .ticket-company-meta{font-size:${styles.metaFontMm}!important;gap:2.2mm!important;}
    .ticket-dashed{margin:3mm 0!important;}
    .ticket-label-top{font-size:${styles.labelTopMm}!important;letter-spacing:.2mm!important;}
    .ticket-code{font-size:${styles.codeFontMm}!important;letter-spacing:${is58?'0.25mm':'0.4mm'}!important;}
    .ticket-qr{width:${styles.qrSizeMm}!important;height:${styles.qrSizeMm}!important;}
    .ticket-subtitle{font-size:${styles.subtitleMm}!important;margin:1.5mm 0 2.5mm!important;}
    .ticket-row{font-size:${styles.rowFontMm}!important;margin:1.2mm 0!important;gap:2mm!important;}
    .ticket-footer{font-size:${styles.footerFontMm}!important;margin-top:1.2mm!important;}
    .ticket-footer p{margin:0 0 .6mm!important;}
    .cut-space{height:${styles.cutHeightMm}!important;}
  }
`;
}
