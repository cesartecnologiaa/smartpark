export function money(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function shortDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

export function shortDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function shortTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function toInputNumber(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(normalized || 0);
}

export function plateMask(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function phoneMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => {
      return [a && `(${a}`, a.length === 2 && ')', b, c && `-${c}`].filter(Boolean).join(' ')
        .replace(') ', ') ');
    }).trim();
  }
  return digits.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `${a ? `(${a}) ` : ''}${b}${c ? `-${c}` : ''}`);
}


export function formatDurationMinutes(totalMinutes?: number) {
  const minutes = Math.max(0, totalMinutes || 0);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}min`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes} min`;
}
