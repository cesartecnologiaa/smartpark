'use client';

import { getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { shortDate, shortTime } from '@/utils/format';
import { buildStyles, basePrintStyles } from '@/lib/printStyles';

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
    // Android fires focus when user returns from the print/share dialog
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
