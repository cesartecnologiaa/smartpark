'use client';

import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { CashRegister, EstablishmentSettings } from '@/types';
import { money, shortDateTime } from '@/utils/format';

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

export default function PrintCaixaPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const printMode = searchParams.get('printMode');
  const autoPrint = searchParams.get('autoPrint') !== '0';
  const returnTo = searchParams.get('returnTo');
  
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  const startedRef = useRef(false);
  const blurredRef = useRef(false);
  const finishedRef = useRef(false);

  const canShare = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '') && typeof navigator.share === 'function';

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    
    if (printMode === 'rawbt' || /Android/i.test(navigator.userAgent)) {
      if (returnTo) window.location.replace(returnTo);
      else window.history.back();
      return;
    }
    
    try { window.close(); } catch (_) {}
    setTimeout(() => {
      if (!window.closed) {
        if (returnTo) window.location.replace(returnTo);
        else window.history.back();
      }
    }, 500);
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
      if (shareError?.name !== 'AbortError') handlePrintClick();
    }
  }

  useEffect(() => {
    async function load() {
      const [cashSnap, settingsSnap] = await Promise.all([
        getDoc(tenantDoc(db, tenantId, 'cashRegisters', params.id)),
        getDoc(tenantDoc(db, tenantId, 'settings', 'establishment')),
      ]);
      if (cashSnap.exists()) setCash({ id: cashSnap.id, ...(cashSnap.data() as Omit<CashRegister, 'id'>) });
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as EstablishmentSettings);
      setLoaded(true);
    }
    load();
  }, [params.id, tenantId]);

  useEffect(() => {
    if (!autoPrint || !loaded || !cash || startedRef.current) return;

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
  }, [autoPrint, loaded, cash]);

  const sangrias = useMemo(() => cash?.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0, [cash]);
  const saldo = cash ? cash.openingAmount + cash.revenueByTickets + cash.revenueByMonthly - sangrias : 0;
  const is58 = (settings?.printerWidth || '80mm') === '58mm';
  const styles = useMemo(() => ({
    pageWidth: is58 ? '58mm' : '80mm',
    padding: is58 ? '1.4mm 1.15mm 1.5mm' : '4mm 3.5mm 3mm',
    companyFont: is58 ? '3.45mm' : '5.6mm',
    companySub: is58 ? '1.85mm' : '2.9mm',
    metaFont: is58 ? '1.72mm' : '2.8mm',
    subtitle: is58 ? '2.75mm' : '4.3mm',
    rowFont: is58 ? '2.32mm' : '4.3mm',
    footerFont: is58 ? '1.68mm' : '2.6mm',
    cutHeight: is58 ? '6mm' : '14mm',
  }), [is58]);

  if (!cash) {
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
          <div className="ticket-subtitle">Fechamento de Caixa</div>
          <div className="ticket-row"><span className="ticket-row-label">Operador:</span><span className="ticket-row-value">{cash.operatorName}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Abertura:</span><span className="ticket-row-value">{shortDateTime(cash.openedAt)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Fechamento:</span><span className="ticket-row-value">{shortDateTime(cash.closedAt)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Valor Inicial:</span><span className="ticket-row-value">{money(cash.openingAmount)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Faturamento:</span><span className="ticket-row-value">{money(cash.revenueByTickets + cash.revenueByMonthly)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Sangrias:</span><span className="ticket-row-value">{money(sangrias)}</span></div>
          <div className="ticket-row"><span className="ticket-row-label">Saldo Final:</span><span className="ticket-row-value">{money(saldo)}</span></div>
          <div className="ticket-dashed" />
          <div className="ticket-footer">
            {settings?.ticketFooter ? <p>{settings.ticketFooter}</p> : null}
            <p>Documento de fechamento do caixa.</p>
          </div>
          <div className="cut-space" />
        </div>
      </div>

      <style jsx global>{`
        .print-ticket-page { display: flex; justify-content: center; padding: 0; background: #eef2f7; min-height: 100vh; }
        .print-ticket { width: ${styles.pageWidth}; background: #fff; color: #111827; padding: ${styles.padding}; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; box-shadow: ${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15, 23, 42, 0.08)'}; }
        .ticket-header { text-align: center; margin-bottom: 2.2mm; }
        .ticket-company { text-align: center; font-size: ${styles.companyFont}; font-weight: 600; line-height: 1.15; margin-bottom: 1.2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ticket-company-sub { font-size: ${styles.companySub}; font-weight: 500; line-height: 1.25; color: #000; margin-bottom: 0.8mm; }
        .ticket-company-meta { display: flex; justify-content: center; gap: 2.2mm; flex-wrap: wrap; font-size: ${styles.metaFont}; line-height: 1.2; color: #000; font-weight: 500; }
        .ticket-dashed { border-top: 0.35mm dashed #94a3b8; margin: 3mm 0; }
        .ticket-subtitle { text-align: center; font-size: ${styles.subtitle}; font-weight: 600; color: #000; margin: 1.5mm 0 2.5mm; }
        .ticket-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; margin: 1.2mm 0; font-size: ${styles.rowFont}; line-height: 1.35; }
        .ticket-row-label { color: #000; font-weight: 500; }
        .ticket-row-value { color: #111827; font-weight: 600; text-align: right; }
        .ticket-footer { text-align: center; font-size: ${styles.footerFont}; line-height: 1.2; color: #000; font-weight: 500; margin-top: 1.2mm; }
        .ticket-footer p { margin: 0 0 0.6mm; }
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
