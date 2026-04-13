import { CashRegister, ParkingTicket } from '@/types';

export function getTicketOfficialAmount(ticket?: Partial<ParkingTicket> | null): number {
  if (!ticket) return 0;
  const candidates = [
    (ticket as any).finalAmount,
    (ticket as any).totalAmount,
    (ticket as any).chargedAmount,
    ticket.amountCharged,
    (ticket as any).amount,
    (ticket as any).total,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function sumTicketOfficialAmounts(tickets: Array<Partial<ParkingTicket> | null | undefined>): number {
  return Number(tickets.reduce((sum, ticket) => sum + getTicketOfficialAmount(ticket), 0).toFixed(2));
}

export function buildCashTicketRevenueMap(tickets: ParkingTicket[]): Record<string, number> {
  return tickets.reduce<Record<string, number>>((acc, ticket) => {
    const cashId = ticket.closedCashRegisterId;
    if (!cashId) return acc;
    acc[cashId] = Number(((acc[cashId] || 0) + getTicketOfficialAmount(ticket)).toFixed(2));
    return acc;
  }, {});
}

export function getCashDisplayedTicketRevenue(cash: CashRegister | null | undefined, ticketRevenueMap: Record<string, number>) {
  if (!cash) return 0;
  return Number((ticketRevenueMap[cash.id] || 0).toFixed(2));
}

export function getCashDisplayedTotalRevenue(cash: CashRegister | null | undefined, ticketRevenueMap: Record<string, number>) {
  if (!cash) return 0;
  return Number((getCashDisplayedTicketRevenue(cash, ticketRevenueMap) + (cash.revenueByMonthly || 0)).toFixed(2));
}

export function getCashDisplayedBalance(cash: CashRegister | null | undefined, ticketRevenueMap: Record<string, number>) {
  if (!cash) return 0;
  const sangrias = cash.withdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0;
  return Number((cash.openingAmount + getCashDisplayedTotalRevenue(cash, ticketRevenueMap) - sangrias).toFixed(2));
}
