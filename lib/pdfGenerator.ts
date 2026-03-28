import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { CashRegister, EstablishmentSettings, ParkingTicket, PriceSetting } from '@/types';
import { money, shortDateTime } from '@/utils/format';

const PAPER_WIDTH_MM = 80;
const DEFAULT_HEIGHT_MM = 220;
const CUT_EXTRA_MM = 35;
const BLUE: [number, number, number] = [10, 132, 255];
const BLACK: [number, number, number] = [18, 18, 18];
const GRAY: [number, number, number] = [90, 90, 90];
const LIGHT_GRAY: [number, number, number] = [220, 220, 220];

function createDoc(heightMm = DEFAULT_HEIGHT_MM) {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAPER_WIDTH_MM, heightMm] });
}

function openPrintPreview(doc: jsPDF, fileName: string) {
  doc.autoPrint();
  doc.setProperties({ title: fileName });
  doc.output('dataurlnewwindow');
}

function centerText(doc: jsPDF, text: string, y: number, size = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = BLACK) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(text, PAPER_WIDTH_MM / 2, y, { align: 'center', maxWidth: 72 });
}

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.2);
  doc.line(3, y, PAPER_WIDTH_MM - 3, y);
}

function companyInfo(settings?: EstablishmentSettings) {
  return {
    name: settings?.name || process.env.NEXT_PUBLIC_COMPANY_NAME || 'SmartPark',
    document: settings?.document || process.env.NEXT_PUBLIC_COMPANY_DOCUMENT || '',
    phone: settings?.phone || '',
    address: settings?.address || '',
    footer: settings?.ticketFooter || 'Não nos responsabilizamos por objetos deixados no interior do veículo.',
  };
}

async function generateQRCode(data: string) {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    width: 200,
    color: {
      dark: '#0A84FF',
      light: '#FFFFFF',
    },
  });
}

function blockLine(doc: jsPDF, label: string, value: string, y: number, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(`${label} ${value}`, 4, y, { maxWidth: 72 });
}

function addCutArea(doc: jsPDF, y: number) {
  line(doc, y);
  centerText(doc, '--- espaço para corte / guilhotina ---', y + 7, 7, 'normal', GRAY);
  doc.setTextColor(255, 255, 255);
  doc.text(' ', 2, y + 25);
}

export async function generateEntryTicketPdf(ticket: ParkingTicket, settings?: EstablishmentSettings) {
  const doc = createDoc(200 + CUT_EXTRA_MM);
  const company = companyInfo(settings);
  const qrPayload = `${ticket.id}|${ticket.shortTicket}|${ticket.plate}|${ticket.entryAt}`;
  const qrCodeUrl = await generateQRCode(qrPayload);

  centerText(doc, company.name, 10, 13, 'bold');
  if (company.document) centerText(doc, `CNPJ: ${company.document}`, 16, 8, 'normal', GRAY);
  if (company.phone) centerText(doc, company.phone, 21, 8, 'normal', GRAY);
  if (company.address) centerText(doc, company.address, 26, 8, 'normal', GRAY);

  line(doc, 30);
  centerText(doc, 'COMPROVANTE DE ENTRADA', 36, 9, 'bold', BLUE);

  doc.addImage(qrCodeUrl, 'PNG', 20, 40, 40, 40);

  centerText(doc, `TICKET ${ticket.shortTicket}`, 88, 18, 'bold');
  blockLine(doc, 'Tipo:', ticket.vehicleType, 98, true);
  blockLine(doc, 'Placa:', (ticket.plate || 'Não informada').toUpperCase(), 104, true);
  blockLine(doc, 'Modelo:', ticket.model || 'Não informado', 110);
  blockLine(doc, 'Vaga:', ticket.parkingSpaceCode || 'Não definida', 116);
  blockLine(doc, 'Entrada:', shortDateTime(ticket.entryAt), 122);
  blockLine(doc, 'Operador:', ticket.cashierName || '-', 128);

  line(doc, 134);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(company.footer, 4, 142, { maxWidth: 72 });
  centerText(doc, 'Apresente este cupom na saída.', 156, 8, 'bold', BLUE);

  addCutArea(doc, 188);
  openPrintPreview(doc, `ticket_entrada_${ticket.shortTicket}`);
  return doc;
}

export async function generateExitReceiptPdf(ticket: ParkingTicket, settings?: EstablishmentSettings) {
  const doc = createDoc(220 + CUT_EXTRA_MM);
  const company = companyInfo(settings);
  const qrPayload = `${ticket.id}|${ticket.shortTicket}|${ticket.plate}|${ticket.amountCharged || 0}|${ticket.exitAt || ''}`;
  const qrCodeUrl = await generateQRCode(qrPayload);

  centerText(doc, company.name, 10, 13, 'bold');
  if (company.document) centerText(doc, `CNPJ: ${company.document}`, 16, 8, 'normal', GRAY);
  if (company.phone) centerText(doc, company.phone, 21, 8, 'normal', GRAY);
  line(doc, 25);
  centerText(doc, 'COMPROVANTE DE SAÍDA', 31, 10, 'bold', BLUE);

  blockLine(doc, 'Ticket:', ticket.shortTicket, 42, true);
  blockLine(doc, 'Placa:', (ticket.plate || 'Não informada').toUpperCase(), 48, true);
  blockLine(doc, 'Tipo:', ticket.vehicleType, 54);
  blockLine(doc, 'Entrada:', shortDateTime(ticket.entryAt), 60);
  blockLine(doc, 'Saída:', shortDateTime(ticket.exitAt), 66);
  blockLine(doc, 'Permanência:', `${ticket.durationMinutes || 0} min`, 72);
  blockLine(doc, 'Pagamento:', ticket.paymentMethod || '-', 78);
  blockLine(doc, 'Operador:', ticket.cashierName || '-', 84);

  line(doc, 90);
  centerText(doc, 'VALOR TOTAL', 98, 10, 'bold', GRAY);
  centerText(doc, money(ticket.amountCharged || 0), 110, 20, 'bold', BLUE);

  doc.addImage(qrCodeUrl, 'PNG', 22, 118, 36, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(company.footer, 4, 162, { maxWidth: 72 });
  centerText(doc, 'Obrigado pela preferência!', 176, 8, 'bold', BLUE);

  addCutArea(doc, 208);
  openPrintPreview(doc, `ticket_saida_${ticket.shortTicket}`);
  return doc;
}

export async function generateCashClosingPdf(
  cashRegister: CashRegister,
  finishedTickets: ParkingTicket[],
  priceSettings: PriceSetting[],
  settings?: EstablishmentSettings
) {
  const dynamicHeight = 180 + (priceSettings.length * 8) + (cashRegister.withdrawals.length * 8) + CUT_EXTRA_MM;
  const doc = createDoc(dynamicHeight);
  const company = companyInfo(settings);

  centerText(doc, company.name, 10, 13, 'bold');
  if (company.document) centerText(doc, `CNPJ: ${company.document}`, 16, 8, 'normal', GRAY);
  line(doc, 22);
  centerText(doc, 'FECHAMENTO DE CAIXA', 29, 10, 'bold', BLUE);

  blockLine(doc, 'Operador:', cashRegister.operatorName, 40, true);
  blockLine(doc, 'Abertura:', shortDateTime(cashRegister.openedAt), 46);
  blockLine(doc, 'Fechamento:', shortDateTime(cashRegister.closedAt || new Date().toISOString()), 52);
  blockLine(doc, 'Valor inicial:', money(cashRegister.openingAmount), 58);

  line(doc, 64);
  centerText(doc, 'FATURAMENTO POR CATEGORIA', 71, 9, 'bold', GRAY);

  const byCategory = finishedTickets.reduce<Record<string, number>>((acc, item) => {
    acc[item.vehicleType] = (acc[item.vehicleType] || 0) + (item.amountCharged || 0);
    return acc;
  }, {});

  let y = 80;
  priceSettings.forEach((item) => {
    blockLine(doc, `${item.vehicleType}:`, money(byCategory[item.vehicleType] || 0), y);
    y += 7;
  });

  const sangrias = cashRegister.withdrawals.reduce((sum, item) => sum + item.amount, 0);
  const saldoFinal = cashRegister.openingAmount + cashRegister.revenueByTickets + cashRegister.revenueByMonthly - sangrias;

  line(doc, y + 1);
  y += 8;
  blockLine(doc, 'Mensalidades:', money(cashRegister.revenueByMonthly), y, true); y += 7;
  blockLine(doc, 'Avulsos:', money(cashRegister.revenueByTickets), y, true); y += 7;
  blockLine(doc, 'Sangrias:', money(sangrias), y, true); y += 7;
  blockLine(doc, 'Saldo final:', money(saldoFinal), y, true); y += 10;

  if (cashRegister.withdrawals.length) {
    line(doc, y);
    y += 7;
    centerText(doc, 'SANGRIAS', y, 9, 'bold', GRAY);
    y += 8;
    cashRegister.withdrawals.forEach((withdrawal) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      doc.text(`${money(withdrawal.amount)} - ${withdrawal.reason}`, 4, y, { maxWidth: 72 });
      y += 7;
    });
  }

  addCutArea(doc, y + 10);
  openPrintPreview(doc, `fechamento_caixa_${cashRegister.id}`);
  return doc;
}
