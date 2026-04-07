'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { CashRegister, EstablishmentSettings } from '@/types';
import { money, shortDateTime } from '@/utils/format';

export default function PrintCaixaPage({ params }: { params: { id: string } }) {
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);

  useEffect(() => {
    async function load() {
      const [cashSnap, settingsSnap] = await Promise.all([
        getDoc(doc(db, 'cashRegisters', params.id)),
        getDoc(doc(db, 'settings', 'establishment')),
      ]);
      if (cashSnap.exists()) setCash({ id: cashSnap.id, ...(cashSnap.data() as Omit<CashRegister, 'id'>) });
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as EstablishmentSettings);
      setTimeout(() => window.print(), 350);
      window.onafterprint = () => window.close();
    }
    load();
  }, [params.id]);

  const sangrias = useMemo(() => cash?.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0, [cash]);
  const saldo = cash ? cash.openingAmount + cash.revenueByTickets + cash.revenueByMonthly - sangrias : 0;

  if (!cash) return <div className="print-ticket-page"><div className="print-ticket">Carregando...</div></div>;

  return (
    <div className="print-ticket-page">
      <div className="print-ticket">
        <div className="ticket-header">
          <div className="ticket-company">{settings?.name || 'SmartPark'}</div>
          {settings?.address ? <div className="ticket-company-sub">{settings.address}</div> : null}
          {(settings?.phone || settings?.document) ? (
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
  );
}
