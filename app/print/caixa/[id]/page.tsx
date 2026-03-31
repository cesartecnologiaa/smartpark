'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { CashRegister, EstablishmentSettings } from '@/types';
import { money, shortDateTime } from '@/utils/format';
import { buildStyles, basePrintStyles } from '@/lib/printStyles';
import { usePrint } from '@/lib/print-context';

export default function PrintCaixaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const returnTo = searchParams.get('returnTo');
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const startedRef = useRef(false); const blurredRef = useRef(false); const finishedRef = useRef(false);

  useEffect(() => { (async () => {
    const [cashSnap, settingsSnap] = await Promise.all([
      getDoc(tenantDoc(db, tenantId, 'cashRegisters', params.id)),
      getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
    ]);
    if (cashSnap.exists()) setCash({ id: cashSnap.id, ...(cashSnap.data() as Omit<CashRegister, 'id'>) });
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
    if (!autoPrint || !loaded || !cash || startedRef.current) return;

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
  }, [autoPrint, cash, loaded, printMode, returnTo]);

  const sangrias = useMemo(() => cash?.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0, [cash]);
  const saldo = cash ? cash.openingAmount + cash.revenueByTickets + cash.revenueByMonthly - sangrias : 0;
  const is58 = (settings?.printerWidth || '80mm') === '58mm';
  const styles = useMemo(() => buildStyles(is58), [is58]);

  if (!cash || !loaded) return <><div className="print-ticket-page"><div className="print-ticket print-ticket-loading">Preparando cupom...</div></div><style>{basePrintStyles(styles, is58)}</style></>;

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
          <div className="ticket-subtitle">Fechamento de Caixa</div>
          <div className="ticket-row"><span className="ticket-row-label">Operador:</span><span className="ticket-row-value">{cash.operatorName}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Abertura:</span><span className="ticket-row-value">{shortDateTime(cash.openedAt)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Fechamento:</span><span className="ticket-row-value">{shortDateTime(cash.closedAt)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Valor Inicial:</span><span className="ticket-row-value">{money(cash.openingAmount)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Faturamento:</span><span className="ticket-row-value">{money(cash.revenueByTickets + cash.revenueByMonthly)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Sangrias:</span><span className="ticket-row-value">{money(sangrias)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Saldo Final:</span><span className="ticket-row-value">{money(saldo)}</span></div>
          <div className="ticket-dashed" />
          <div className="ticket-footer">{settings?.ticketFooter ? <p>{settings.ticketFooter}</p> : null}<p>Documento de fechamento do caixa.</p></div>
          <div className="cut-space" />
        </div>
      </div>
      <style>{basePrintStyles(styles, is58)}</style>
    </>
  );
}
