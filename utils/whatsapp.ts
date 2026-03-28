import { ParkingTicket } from '@/types';
import { money, shortDateTime } from '@/utils/format';

export function normalizeWhatsappNumber(phone?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function buildReceiptWhatsappUrl(ticket: ParkingTicket, establishmentName = 'Estacionamento') {
  const phone = normalizeWhatsappNumber(ticket.phone);
  if (!phone) return '';

  const lines = [
    `*${establishmentName}*`,
    '',
    '*Comprovante de Saída*',
    `Ticket: ${ticket.shortTicket}`,
    `Placa: ${ticket.plate || '-'}`,
    `Veículo: ${ticket.vehicleType || '-'}`,
    `Entrada: ${shortDateTime(ticket.entryAt)}`,
    `Saída: ${shortDateTime(ticket.exitAt)}`,
    `Permanência: ${ticket.durationMinutes || 0} min`,
    `Valor: ${money(ticket.amountCharged || 0)}`,
    `Pagamento: ${ticket.paymentMethod || '-'}`,
    '',
    'Obrigado pela preferência!',
  ];

  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildEntryWhatsappUrl(ticket: ParkingTicket, establishmentName = 'Estacionamento') {
  const phone = normalizeWhatsappNumber(ticket.phone);
  if (!phone) return '';

  const lines = [
    `*${establishmentName}*`,
    '',
    '*Ticket de Entrada*',
    `Código: ${ticket.shortTicket}`,
    `Placa: ${ticket.plate || '-'}`,
    `Veículo: ${ticket.vehicleType || '-'}`,
    `Vaga: ${ticket.parkingSpaceCode || '-'}`,
    `Entrada: ${shortDateTime(ticket.entryAt)}`,
    '',
    'Guarde este comprovante para a saída.',
  ];

  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(lines.join('\n'))}`;
}
