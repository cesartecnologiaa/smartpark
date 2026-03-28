import { PriceSetting } from '@/types';

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateParkingAmount(entryAt: string, priceSetting?: PriceSetting) {
  if (!priceSetting) {
    return { minutes: 0, total: 0, fractions: 0, fractionValue: 0 };
  }

  const start = new Date(entryAt).getTime();
  const end = Date.now();
  const minutes = Math.max(0, Math.ceil((end - start) / 60000));

  const tolerancia = Number(priceSetting.tolerancia || 0);
  const valorHora = Number(priceSetting.valorHora || 0);
  const diariaMaxima = Number(priceSetting.diariaMaxima || 0);
  const fractionValue = roundCurrency(valorHora / 4);

  if (minutes <= tolerancia) {
    return { minutes, total: 0, fractions: 0, fractionValue };
  }

  const fractions = Math.ceil(minutes / 15);
  let total = fractions * fractionValue;

  if (diariaMaxima > 0 && total > diariaMaxima) {
    total = diariaMaxima;
  }

  return {
    minutes,
    total: roundCurrency(total),
    fractions,
    fractionValue,
  };
}

export function diffDaysFromNow(date?: string) {
  if (!date) return 999;
  const end = new Date(date).setHours(0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - end) / 86400000);
}
