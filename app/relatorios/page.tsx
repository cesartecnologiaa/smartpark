'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Download, FileText, MessageCircleMore, Printer, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import StatCard from '@/components/StatCard';
import { db } from '@/lib/firebase';
import { openPrintPage } from '@/lib/print';
import { EstablishmentSettings, ParkingTicket, PaymentMethod } from '@/types';
import { money, shortDateTime } from '@/utils/format';
import { buildReceiptWhatsappUrl } from '@/utils/whatsapp';

const PAGE_SIZE = 10;

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | PaymentMethod>('todos');
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parkingTickets'), (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingTicket, 'id'>) })));
    });

    getDoc(doc(db, 'settings', 'establishment')).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as EstablishmentSettings);
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return tickets
      .filter((item) => {
        const date = item.exitAt || item.entryAt;
        if (item.status !== 'finalizado') return false;
        if (startDate && date < `${startDate}T00:00:00`) return false;
        if (endDate && date > `${endDate}T23:59:59`) return false;
        if (paymentFilter !== 'todos' && item.paymentMethod !== paymentFilter) return false;

        const q = search.trim().toUpperCase();
        if (!q) return true;

        return (
          String(item.shortTicket || '').toUpperCase().includes(q) ||
          String(item.plate || '').toUpperCase().includes(q)
        );
      })
      .sort((a, b) => (b.exitAt || b.entryAt || '').localeCompare(a.exitAt || a.entryAt || ''));
  }, [endDate, paymentFilter, search, startDate, tickets]);

  const totals = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, item) => sum + (item.amountCharged || 0), 0);
    const totalVehicles = filtered.length;

    return {
      totalRevenue,
      totalVehicles,
      exits: filtered.length,
      ticketAverage: totalVehicles ? totalRevenue / totalVehicles : 0,
    };
  }, [filtered]);

  const dailySummary = useMemo(
    () =>
      Object.entries(
        filtered.reduce<Record<string, number>>((acc, item) => {
          const key = (item.exitAt || item.entryAt || '').slice(0, 10);
          acc[key] = (acc[key] || 0) + (item.amountCharged || 0);
          return acc;
        }, {})
      ),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate, paymentFilter]);

  function exportCsv() {
    const header = ['Data', 'Cupom', 'Placa', 'Tipo', 'Valor', 'Pagamento', 'Descrição'];

    const rows = filtered.map((item) => [
      shortDateTime(item.exitAt || item.entryAt),
      item.shortTicket,
      item.plate || '-',
      item.vehicleType,
      String(item.amountCharged || 0).replace('.', ','),
      item.paymentMethod || '-',
      `Ticket ${item.shortTicket}`,
    ]);

    const csv = [header, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-smartpark.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    let y = 16;

    const BLUE: [number, number, number] = [10, 132, 255];
    const BLACK: [number, number, number] = [15, 23, 42];
    const GRAY: [number, number, number] = [100, 116, 139];
    const LIGHT: [number, number, number] = [248, 250, 252];
    const BORDER: [number, number, number] = [226, 232, 240];

    const companyName = settings?.name || 'SmartPark';
    const companyDocument = settings?.document || '';
    const companyPhone = settings?.phone || '';
    const companyAddress = settings?.address || '';
    const generatedAt = new Date().toLocaleString('pt-BR');

    const periodLabel = `${startDate || 'Início'} até ${endDate || 'Hoje'}`;
    const paymentLabel = paymentFilter === 'todos' ? 'Todas' : paymentFilter;
    const searchLabel = search.trim() || 'Nenhuma';

    const tableHeaders = ['Data', 'Cupom', 'Placa', 'Tipo', 'Valor', 'Pagamento'];
    const rowHeight = 7;
    const colX = [14, 44, 68, 94, 132, 160];

    function drawBlueTopBar() {
      pdf.setFillColor(...BLUE);
      pdf.rect(0, 0, pageWidth, 8, 'F');
    }

    function drawLine(posY: number) {
      pdf.setDrawColor(...BORDER);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, posY, pageWidth - marginX, posY);
    }

    function ensureSpace(requiredHeight: number) {
      if (y + requiredHeight > pageHeight - 18) {
        pdf.addPage();
        drawBlueTopBar();
        y = 18;
      }
    }

    function sectionTitle(title: string) {
      ensureSpace(12);
      drawLine(y);
      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...GRAY);
      pdf.text(title, marginX, y);
      y += 4;
    }

    function infoRow(label: string, value: string, posY: number) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...BLACK);
      pdf.text(label, marginX, posY);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(value || '-', marginX + 34, posY);
    }

    function summaryBox(
      x: number,
      top: number,
      w: number,
      h: number,
      title: string,
      value: string,
      highlight = false
    ) {
      pdf.setDrawColor(...BORDER);
      pdf.setLineWidth(0.2);

      if (highlight) {
        pdf.setFillColor(239, 246, 255);
      } else {
        pdf.setFillColor(...LIGHT);
      }

      pdf.roundedRect(x, top, w, h, 3, 3, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...GRAY);
      pdf.text(title, x + 4, top + 7);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(highlight ? 13 : 12);
      pdf.setTextColor(...(highlight ? BLUE : BLACK));
      pdf.text(value, x + 4, top + 15);
    }

    drawBlueTopBar();

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...BLACK);
    pdf.text('SmartPark', marginX, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...GRAY);
    pdf.text('Relatório Financeiro e Operacional', marginX, y + 5);

    y += 13;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...BLACK);
    pdf.text(companyName, marginX, y);

    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);

    if (companyAddress) {
      pdf.text(companyAddress, marginX, y);
      y += 4.5;
    }

    const metaLine = [companyPhone ? `Tel: ${companyPhone}` : '', companyDocument ? `CNPJ: ${companyDocument}` : '']
      .filter(Boolean)
      .join('   •   ');

    if (metaLine) {
      pdf.text(metaLine, marginX, y);
      y += 4.5;
    }

    drawLine(y);
    y += 8;

    sectionTitle('Filtros aplicados');
    infoRow('Período:', periodLabel, y);
    y += 6;
    infoRow('Pagamento:', paymentLabel, y);
    y += 6;
    infoRow('Busca:', searchLabel, y);
    y += 8;

    sectionTitle('Resumo geral');
    ensureSpace(32);

    const boxY = y;
    const gap = 4;
    const boxWidth = (pageWidth - marginX * 2 - gap) / 2;

    summaryBox(marginX, boxY, boxWidth, 20, 'Faturamento Total', money(totals.totalRevenue), true);
    summaryBox(marginX + boxWidth + gap, boxY, boxWidth, 20, 'Total de Veículos', String(totals.totalVehicles));

    summaryBox(marginX, boxY + 24, boxWidth, 20, 'Saídas Realizadas', String(totals.exits));
    summaryBox(marginX + boxWidth + gap, boxY + 24, boxWidth, 20, 'Ticket Médio', money(totals.ticketAverage));

    y += 52;

    sectionTitle('Faturamento diário');
    if (dailySummary.length) {
      dailySummary.slice(0, 12).forEach(([date, value]) => {
        ensureSpace(6);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        pdf.text(date, marginX, y);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...BLACK);
        pdf.text(money(value), pageWidth - marginX, y, { align: 'right' });

        y += 5.5;
      });
    } else {
      ensureSpace(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...GRAY);
      pdf.text('Nenhum registro no período.', marginX, y);
      y += 6;
    }

    y += 2;
    sectionTitle('Transações');

    ensureSpace(12);
    pdf.setFillColor(...LIGHT);
    pdf.setDrawColor(...BORDER);
    pdf.rect(marginX, y, pageWidth - marginX * 2, 8, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);

    tableHeaders.forEach((header, index) => {
      pdf.text(header, colX[index], y + 5.4);
    });

    y += 10;

    if (!filtered.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...GRAY);
      pdf.text('Nenhuma transação encontrada.', marginX, y);
      y += 6;
    } else {
      filtered.forEach((item) => {
        ensureSpace(9);

        drawLine(y - 1.5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.2);
        pdf.setTextColor(31, 41, 55);

        const data = shortDateTime(item.exitAt || item.entryAt);
        const cupom = String(item.shortTicket || '-');
        const placa = String(item.plate || '-');
        const tipo = String(item.vehicleType || '-');
        const valor = money(item.amountCharged || 0);
        const pagamento = String(item.paymentMethod || '-');

        pdf.text(data, colX[0], y + 3.5, { maxWidth: 28 });
        pdf.text(cupom, colX[1], y + 3.5, { maxWidth: 20 });
        pdf.text(placa, colX[2], y + 3.5, { maxWidth: 22 });
        pdf.text(tipo, colX[3], y + 3.5, { maxWidth: 34 });
        pdf.text(valor, colX[4], y + 3.5, { maxWidth: 22 });
        pdf.text(pagamento, colX[5], y + 3.5, { maxWidth: 28 });

        y += rowHeight;
      });
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Gerado em ${generatedAt}`, marginX, pageHeight - 8);
    pdf.text('SmartPark® 2026 - Todos os Direitos Reservados.', pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });

    pdf.save('relatorio-smartpark.pdf');
  }

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <PageHeader
          title="Relatórios"
          subtitle="Análise financeira e operacional"
          actions={
            <>
              <button className="secondary-button" onClick={exportCsv}>
                <Download size={16} />
                Exportar CSV
              </button>
              <button className="primary-button" onClick={exportPdf}>
                <FileText size={16} />
                Exportar PDF
              </button>
            </>
          }
        />

        <div className="panel-card mb-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              className="app-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              className="app-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <select
              className="app-input"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'todos' | PaymentMethod)}
            >
              <option value="todos">Todas as formas</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="mensalista">Mensalista</option>
            </select>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="app-input pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número do cupom ou placa"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Faturamento Total"
            value={money(totals.totalRevenue)}
            icon={<Download size={20} />}
          />
          <StatCard
            title="Total de Veículos"
            value={String(totals.totalVehicles)}
            icon={<Printer size={20} />}
            tone="green"
          />
          <StatCard
            title="Saídas Realizadas"
            value={String(totals.exits)}
            icon={<Printer size={20} />}
            tone="red"
          />
          <StatCard
            title="Ticket Médio"
            value={money(totals.ticketAverage)}
            icon={<MessageCircleMore size={20} />}
            tone="slate"
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="panel-card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Faturamento Diário</h2>
            <div className="mt-4 space-y-4">
              {dailySummary.map(([date, value]) => (
                <div key={date}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>{date}</span>
                    <strong className="text-slate-900">{money(value)}</strong>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(
                          100,
                          (value / Math.max(totals.totalRevenue || 1, 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!filtered.length ? (
                <p className="text-sm text-slate-500">Nenhum registro no período.</p>
              ) : null}
            </div>
          </div>

          <div className="panel-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Transações recentes</h2>
              <p className="text-sm text-slate-500">{filtered.length} encontradas</p>
            </div>

            <div className="table-shell mt-4 max-h-[560px] overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cupom</th>
                    <th>Placa</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                    <th>Comprovante</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length ? (
                    paginated.map((ticket) => {
                      const whatsappUrl = buildReceiptWhatsappUrl(
                        ticket,
                        settings?.name || 'Estacionamento'
                      );

                      return (
                        <tr key={ticket.id}>
                          <td>{shortDateTime(ticket.exitAt || ticket.entryAt)}</td>
                          <td>{ticket.shortTicket}</td>
                          <td>{ticket.plate || '-'}</td>
                          <td>{money(ticket.amountCharged)}</td>
                          <td>{ticket.paymentMethod || '-'}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                className="secondary-button py-2"
                                onClick={() => openPrintPage(`/print/saida/${ticket.id}`)}
                              >
                                <Printer size={16} />
                              </button>
                              <a
                                className={`secondary-button py-2 ${
                                  !whatsappUrl ? 'pointer-events-none opacity-50' : ''
                                }`}
                                href={whatsappUrl || '#'}
                                target="_blank"
                              >
                                <MessageCircleMore size={16} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>Nenhum registro</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-3">
                <button
                  className="secondary-button py-2"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  className="secondary-button py-2"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}