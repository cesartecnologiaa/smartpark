"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Bike, Car, Clock3, MessageCircleMore, Printer, Truck, TruckIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { openPrintPage } from '@/lib/print';
import { CashRegister, EstablishmentSettings, ParkingSpace, ParkingTicket, VehicleType } from '@/types';
import { phoneMask, plateMask } from '@/utils/format';
import { generateUniqueShortTicket } from '@/utils/ticket';
import { buildEntryWhatsappUrl } from '@/utils/whatsapp';

const vehicleTypeOptions: { value: VehicleType; label: string; icon: React.ReactNode; long?: boolean }[] = [
  { value: 'CARRO', label: 'Carro', icon: <Car size={24} /> },
  { value: 'MOTO', label: 'Moto', icon: <Bike size={24} /> },
  { value: 'CAMINHONETE', label: 'Caminhonete', icon: <Truck size={24} />, long: true },
  { value: 'CAMINHAO', label: 'Caminhão', icon: <TruckIcon size={24} /> },
];

export default function EntradaPage() {
  const { profile } = useAuth();
  const [vehicleType, setVehicleType] = useState<VehicleType>('CARRO');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<ParkingTicket | null>(null);

  useEffect(() => {
    const unsubSpaces = onSnapshot(collection(db, 'parkingSpaces'), (snapshot) => {
      setSpaces(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ParkingSpace, 'id'>) })));
    });

    getDoc(doc(db, 'settings', 'establishment')).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as EstablishmentSettings);
    });

    if (!profile) return () => unsubSpaces();

    const unsubCash = onSnapshot(
      query(collection(db, 'cashRegisters'), where('status', '==', 'aberto'), where('operatorId', '==', profile.id)),
      (snapshot) => {
        const row = snapshot.docs[0];
        setOpenCashRegister(row ? { id: row.id, ...(row.data() as Omit<CashRegister, 'id'>) } : null);
      }
    );

    return () => {
      unsubSpaces();
      unsubCash();
    };
  }, [profile]);

  const availableSpaces = useMemo(
    () =>
      spaces
        .filter(
          (space) =>
            space.active !== false &&
            space.status === 'livre' &&
            (space.allowedType === 'TODOS' || !space.allowedType || space.allowedType === vehicleType)
        )
        .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true, sensitivity: 'base' })),
    [spaces, vehicleType]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (!profile || !openCashRegister) {
      setMessage('Operação bloqueada. Abra o caixa antes de registrar entrada.');
      return;
    }

    setLoading(true);
    try {
      const shortTicket = await generateUniqueShortTicket();
      const selectedSpace = spaces.find((item) => item.id === selectedSpaceId);

      if (selectedSpace && selectedSpace.status !== 'livre') {
        setMessage('A vaga selecionada não está mais disponível.');
        setLoading(false);
        return;
      }

      const payload = {
        shortTicket,
        plate: plateMask(plate),
        model,
        phone,
        vehicleType,
        status: 'ativo' as const,
        entryAt: new Date().toISOString(),
        entryOperatorId: profile.id,
        entryOperatorName: profile.name,
        cashierId: profile.id,
        cashierName: profile.name,
        parkingSpaceId: selectedSpace?.id || '',
        parkingSpaceCode: selectedSpace?.code || '',
      };

      const docRef = await addDoc(collection(db, 'parkingTickets'), payload);

      if (selectedSpace) {
        await updateDoc(doc(db, 'parkingSpaces', selectedSpace.id), {
          status: 'ocupada',
          currentTicketId: docRef.id,
          currentVehicleType: vehicleType,
          updatedAt: new Date().toISOString(),
        });
      }

      const ticket = { id: docRef.id, ...payload } as ParkingTicket;
      setCreatedTicket(ticket);
      openPrintPage(`/print/entrada/${docRef.id}`);
      setPlate('');
      setModel('');
      setPhone('');
      setSelectedSpaceId('');
      setVehicleType('CARRO');
      setMessage(`Entrada registrada com sucesso. Ticket ${shortTicket} pronto para impressão.`);
    } finally {
      setLoading(false);
    }
  }

  const whatsappEntryUrl = createdTicket
    ? buildEntryWhatsappUrl(createdTicket, settings?.name || 'SmartPark')
    : '';

  return (
    <div>
      <PageHeader title="Registrar Entrada" subtitle="Registre a entrada de um novo veículo" />
      <div className="grid gap-6 xl:grid-cols-[1fr,420px]">
        <div className="panel-card p-6">
          {!openCashRegister ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Caixa fechado para este operador. Abra o caixa antes de registrar entradas.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">Tipo de Veículo</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {vehicleTypeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`selection-card ${vehicleType === option.value ? 'selection-card-active' : ''}`}
                    onClick={() => setVehicleType(option.value)}
                  >
                    <div className="icon-soft-blue">{option.icon}</div>
                    <div className="min-w-0">
                      <p className={`selection-card-title ${option.long ? 'text-[13px]' : ''}`}>{option.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Placa</label>
                <input className="app-input" value={plate} onChange={(e) => setPlate(plateMask(e.target.value))} placeholder="ABC1234" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Modelo</label>
                <input className="app-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo do veículo" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">WhatsApp</label>
                <input className="app-input" value={phone} onChange={(e) => setPhone(phoneMask(e.target.value))} placeholder="Para enviar ticket e comprovante" />
              </div>
            </div>

            <button className="primary-button w-full justify-center" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </button>

            {message ? <p className="text-sm text-blue-700">{message}</p> : null}
          </form>

          {createdTicket ? (
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Entrada registrada</h3>
                  <p className="text-sm text-slate-500">Veículo registrado com sucesso</p>
                </div>
                <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{createdTicket.shortTicket}</div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Placa</span>
                  <strong className="text-slate-900">{createdTicket.plate || '-'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tipo</span>
                  <strong className="text-slate-900">{createdTicket.vehicleType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Vaga</span>
                  <strong className="text-slate-900">{createdTicket.parkingSpaceCode || '-'}</strong>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => openPrintPage(`/print/entrada/${createdTicket.id}`)}
                >
                  <Printer size={16} />
                  Imprimir Ticket
                </button>

                <a
                  className={`secondary-button ${!whatsappEntryUrl ? 'pointer-events-none opacity-50' : ''}`}
                  href={whatsappEntryUrl || '#'}
                  target="_blank"
                >
                  <MessageCircleMore size={16} />
                  Enviar WhatsApp
                </a>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setCreatedTicket(null)}
                >
                  Nova Entrada
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Vaga (opcional)</h2>
              <p className="text-sm text-slate-500">Selecione uma vaga disponível</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Clock3 size={14} /> {availableSpaces.length} livres
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableSpaces.length ? (
              availableSpaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => setSelectedSpaceId(space.id === selectedSpaceId ? '' : space.id)}
                  className={`space-card ${selectedSpaceId === space.id ? 'selection-card-active' : 'space-card-free'}`}
                >
                  <p className="text-sm font-semibold">{space.code}</p>
                  <p className="mt-1 text-xs">Livre</p>
                </button>
              ))
            ) : (
              <div className="col-span-full empty-state min-h-[220px]">
                <p className="text-sm text-slate-500">Nenhuma vaga livre disponível.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}