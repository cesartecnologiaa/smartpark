"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Tag } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RoleGuard from '@/components/RoleGuard';
import { db } from '@/lib/firebase';
import { PriceSetting, VehicleType } from '@/types';
import { money, toInputNumber } from '@/utils/format';

const vehicleTypes: VehicleType[] = ['CARRO', 'MOTO', 'CAMINHONETE', 'CAMINHAO'];

const baseRows = vehicleTypes.map((vehicleType) => ({
  vehicleType,
  valorHora: 0,
  valorAdicional: 0,
  diariaMaxima: 0,
  pernoite: 0,
  mensalista: 0,
  tolerancia: 0,
  active: true,
}));

function vehicleLabel(type: VehicleType) {
  if (type === 'CAMINHAO') return 'CAMINHÃO';
  return type;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        className="app-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function PrecosPage() {
  const [rows, setRows] = useState<PriceSetting[]>(baseRows);
  const [editing, setEditing] = useState<PriceSetting | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'priceSettings'), (snap) => {
      if (snap.empty) return setRows(baseRows);

      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PriceSetting, 'id'>),
      }));

      setRows(
        vehicleTypes.map(
          (type) =>
            items.find((item) => item.vehicleType === type) ||
            baseRows.find((row) => row.vehicleType === type)!
        )
      );
    });

    return () => unsub();
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;

    await setDoc(doc(db, 'priceSettings', editing.vehicleType), {
      ...editing,
      updatedAt: new Date().toISOString(),
      active: true,
    });

    setEditing(null);
  }

  const activeLabel = useMemo(
    () => (editing ? `Editar - ${vehicleLabel(editing.vehicleType)}` : ''),
    [editing]
  );

  return (
    <RoleGuard roles={['admin']}>
      <div>
        <PageHeader
          title="Tabela de Preços"
          subtitle="Configure os valores por tipo de veículo"
        />

        {editing ? (
          <div className="panel-card mb-6 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{activeLabel}</h2>

            <form
              className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              onSubmit={handleSave}
            >
              <Field
                label="1ª Hora (R$)"
                value={editing.valorHora}
                placeholder="Digite o valor da 1ª hora"
                onChange={(value) =>
                  setEditing({ ...editing, valorHora: toInputNumber(value) })
                }
              />

              <Field
                label="Hora Adicional (R$)"
                value={editing.valorAdicional}
                placeholder="Digite o valor da hora adicional"
                onChange={(value) =>
                  setEditing({ ...editing, valorAdicional: toInputNumber(value) })
                }
              />

              <Field
                label="Diária Máxima (R$)"
                value={editing.diariaMaxima || 0}
                placeholder="Digite o valor da diária máxima"
                onChange={(value) =>
                  setEditing({ ...editing, diariaMaxima: toInputNumber(value) })
                }
              />

              <Field
                label="Pernoite (R$)"
                value={editing.pernoite || 0}
                placeholder="Digite o valor do pernoite"
                onChange={(value) =>
                  setEditing({ ...editing, pernoite: toInputNumber(value) })
                }
              />

              <Field
                label="Mensalista (R$)"
                value={editing.mensalista || 0}
                placeholder="Digite o valor do mensalista"
                onChange={(value) =>
                  setEditing({ ...editing, mensalista: toInputNumber(value) })
                }
              />

              <Field
                label="Tolerância (min)"
                value={editing.tolerancia}
                placeholder="Digite a tolerância em minutos"
                onChange={(value) =>
                  setEditing({ ...editing, tolerancia: Number(value || 0) })
                }
              />

              <div className="flex gap-3 md:col-span-2 xl:col-span-3">
                <button className="primary-button" type="submit">
                  Salvar
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <button
              key={row.vehicleType}
              className="panel-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => setEditing(row)}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="icon-soft-blue">
                  <Tag size={18} />
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Ativo
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                {vehicleLabel(row.vehicleType)}
              </h3>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>1ª Hora</span>
                  <strong>{money(row.valorHora)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Hora Adicional</span>
                  <strong>{money(row.valorAdicional)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Diária Máxima</span>
                  <strong>{money(row.diariaMaxima)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pernoite</span>
                  <strong>{money(row.pernoite)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mensalista</span>
                  <strong>{money(row.mensalista)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tolerância</span>
                  <strong>{row.tolerancia} min</strong>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}