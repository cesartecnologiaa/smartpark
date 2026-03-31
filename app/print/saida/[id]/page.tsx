'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { EstablishmentSettings, ParkingTicket } from '@/types';
import { formatDurationMinutes, money, shortDateTime } from '@/utils/format';
import { buildStyles, basePrintStyles } from '@/lib/printStyles';
import { usePrint } from '@/lib/print-context';

const vehicleLabel = (type: ParkingTicket['vehicleType']) =>
  type === 'CAMINHAO' ? 'Caminhão' : type === 'CAMINHONETE' ? 'Caminhonete' : type === 'MOTO' ? 'Moto' : 'Carro';

export default function PrintSaidaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const returnTo = searchParams.get('returnTo');
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const startedRef = useRef(false); const blurredRef = useRef(false); const finishedRef = useRef(false);

  useEffect(() => { (async () => {
    const [ticketSnap, settingsSnap] = await Promise.all([
      getDoc(tenantDoc(db, tenantId, 'parkingTickets', params.id)),
      getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
    ]);
    if (ticketSnap.exists()) setTicket({ id: ticketSnap.id, ...(ticketSnap.data() as Omit<ParkingTicket, 'id'>) });
    if (settingsSnap.exists()) setSettings(settingsSnap.data() as EstablishmentSettings);
    setLoaded(true);
  })(); }, [params.id, tenantId]);

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
    const handleFocus = () => { if (startedRef.current && blurredRef.current) window.setTimeout(finish, 350); };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const raf1 = window.requestAnimationFrame(() => { window.requestAnimationFrame(() => { window.setTimeout(() => { startedRef.current = true; window.print(); }, 300); }); });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [autoPrint, loaded, printMode, returnTo, ticket]);

  const is58 = (settings?.printerWidth || '80mm') === '58mm';
  const styles = useMemo(() => buildStyles(is58), [is58]);

  if (!ticket || !loaded) return <><div className="print-ticket-page"><div className="print-ticket print-ticket-loading">Preparando cupom...</div></div><style>{basePrintStyles(styles, is58)}</style></>;

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
          <div className="ticket-footer">{settings?.ticketFooter ? <p>{settings.ticketFooter}</p> : null}<p>Obrigado pela preferência!</p></div>
          <div className="cut-space" />
        </div>
      </div>
      <style>{basePrintStyles(styles, is58)}</style>
    </>
  );
}
