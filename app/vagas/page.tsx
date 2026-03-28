'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { MapPin, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/lib/firebase';
import { tenantCollection, tenantDoc } from '@/lib/tenant';
import { ParkingSpace, VehicleType } from '@/types';

export default function VagasPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ParkingSpace[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [code, setCode] = useState('');
  const [section, setSection] = useState('Seção A');
  const [allowedType, setAllowedType] = useState<VehicleType | 'TODOS'>('TODOS');
  const [prefix, setPrefix] = useState('A');
  const [quantity, setQuantity] = useState('10');
  const [sectionFilter, setSectionFilter] = useState('Todas');

  useEffect(() => {
    const unsub = onSnapshot(tenantCollection(db, profile?.tenantId, 'parkingSpaces'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ParkingSpace, 'id'>) }));
      items.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));
      setRows(items);
    });
    return () => unsub();
  }, [profile?.tenantId]);

  const stats = useMemo(() => ({
    total: rows.length,
    free: rows.filter((item) => item.status === 'livre').length,
    busy: rows.filter((item) => item.status === 'ocupada').length,
    inactive: rows.filter((item) => item.status === 'inativa').length,
  }), [rows]);

  const sections = useMemo(() => ['Todas', ...Array.from(new Set(rows.map((item) => item.section || 'Sem seção')))], [rows]);
  const filteredRows = sectionFilter === 'Todas' ? rows : rows.filter((row) => (row.section || 'Sem seção') === sectionFilter);

  async function createSpace(event: FormEvent) {
    event.preventDefault();
    await addDoc(tenantCollection(db, profile?.tenantId, 'parkingSpaces'), {
      code,
      section,
      allowedType,
      status: 'livre',
      active: true,
      currentTicketId: null,
      currentVehicleType: null,
      updatedAt: new Date().toISOString(),
    });
    setCode('');
    setSection('Seção A');
    setAllowedType('TODOS');
    setShowForm(false);
  }

  async function createBatch() {
    const total = Number(quantity || 0);
    for (let i = 1; i <= total; i += 1) {
      await addDoc(tenantCollection(db, profile?.tenantId, 'parkingSpaces'), {
        code: `${prefix}${i}`,
        section: `Seção ${prefix}`,
        allowedType: 'TODOS',
        status: 'livre',
        active: true,
        currentTicketId: null,
        currentVehicleType: null,
        updatedAt: new Date().toISOString(),
      });
    }
    setShowBatch(false);
  }

  async function toggleInactive(space: ParkingSpace) {
    if (space.status === 'ocupada') return;
    const nextStatus = space.status === 'inativa' ? 'livre' : 'inativa';
    await updateDoc(tenantDoc(db, profile?.tenantId, 'parkingSpaces', space.id), { status: nextStatus, active: nextStatus !== 'inativa', updatedAt: new Date().toISOString() });
  }

  async function removeSpace(space: ParkingSpace) {
    if (space.status === 'ocupada') return;
    await deleteDoc(tenantDoc(db, profile?.tenantId, 'parkingSpaces', space.id));
  }

  return (
    <div>
      <PageHeader title="Vagas do Estacionamento" subtitle="Organize e gerencie as vagas" actions={<><button className="secondary-button" onClick={() => setShowBatch((v) => !v)}>Criar em Lote</button><button className="primary-button" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Nova Vaga</button></>} />

      {showBatch ? <div className="panel-card mb-6 p-6"><h2 className="text-lg font-semibold text-slate-900">Criar Vagas em Lote</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><input className="app-input" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="Prefixo" /><input className="app-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantidade" /><div className="flex gap-3"><button className="primary-button" onClick={createBatch}>Gerar</button><button className="secondary-button" onClick={() => setShowBatch(false)}>Cancelar</button></div></div></div> : null}
      {showForm ? <div className="panel-card mb-6 p-6"><h2 className="text-lg font-semibold text-slate-900">Nova Vaga</h2><form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={createSpace}><input className="app-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código" required /><input className="app-input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="Seção" required /><select className="app-input" value={allowedType} onChange={(e) => setAllowedType(e.target.value as VehicleType | 'TODOS')}><option value="TODOS">Todos</option><option value="CARRO">Carro</option><option value="MOTO">Moto</option><option value="CAMINHONETE">Caminhonete</option><option value="CAMINHAO">Caminhão</option></select><div className="flex gap-3"><button className="primary-button" type="submit">Salvar</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button></div></form></div> : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel-card p-5"><p className="text-sm text-slate-500">Total</p><h3 className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</h3></div>
        <div className="panel-card p-5"><p className="text-sm text-slate-500">Disponíveis</p><h3 className="mt-2 text-3xl font-semibold text-emerald-700">{stats.free}</h3></div>
        <div className="panel-card p-5"><p className="text-sm text-slate-500">Ocupadas</p><h3 className="mt-2 text-3xl font-semibold text-rose-700">{stats.busy}</h3></div>
        <div className="panel-card p-5"><p className="text-sm text-slate-500">Inativas</p><h3 className="mt-2 text-3xl font-semibold text-slate-700">{stats.inactive}</h3></div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">{sections.map((item) => <button key={item} className={`pill-tab ${sectionFilter === item ? 'pill-tab-active' : ''}`} onClick={() => setSectionFilter(item)}>{item}</button>)}</div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filteredRows.length ? filteredRows.map((space) => (
          <div key={space.id} className={`space-card ${space.status === 'livre' ? 'space-card-free' : space.status === 'ocupada' ? 'space-card-busy' : 'space-card-inactive'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex rounded-2xl bg-white/70 p-2"><MapPin size={16} /></div>
                <p className="mt-3 text-lg font-semibold">{space.code}</p>
                <p className="text-xs">{space.section || 'Sem seção'}</p>
              </div>
              <button className="text-xs underline disabled:no-underline disabled:opacity-40" disabled={space.status === 'ocupada'} onClick={() => toggleInactive(space)}>{space.status === 'inativa' ? 'Ativar' : 'Inativar'}</button>
            </div>
            <p className="mt-3 text-sm font-medium">{space.status === 'livre' ? 'Livre' : space.status === 'ocupada' ? 'Ocupada' : 'Inativa'}</p>
            {space.currentTicketId ? <p className="mt-1 text-xs">Ticket em uso: {space.currentTicketId.slice(0, 6)}</p> : null}
            <div className="mt-4 flex gap-2 text-xs">
              <button className="secondary-button py-2" disabled={space.status === 'ocupada'} onClick={() => removeSpace(space)}>Excluir</button>
            </div>
          </div>
        )) : <div className="col-span-full empty-state"><p className="text-sm text-slate-500">Nenhuma vaga cadastrada.</p></div>}
      </div>
    </div>
  );
}
