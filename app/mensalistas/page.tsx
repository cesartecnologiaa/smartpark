"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { CircleDollarSign, Plus, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { CashRegister, MonthlyCustomer, VehicleType } from '@/types';
import { money, phoneMask, plateMask, shortDate, toInputNumber } from '@/utils/format';
import { diffDaysFromNow } from '@/utils/parking';

const vehicleTypes: VehicleType[] = ['CARRO', 'MOTO', 'CAMINHONETE', 'CAMINHAO'];

export default function MensalistasPage() {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CARRO');
  const [model, setModel] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<MonthlyCustomer[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegister | null>(null);

  useEffect(() => {
    const unsubRows = onSnapshot(query(collection(db, 'monthlyCustomers'), orderBy('name')), (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MonthlyCustomer, 'id'>) })));
    });
    if (!profile) return () => unsubRows();
    const unsubCash = onSnapshot(query(collection(db, 'cashRegisters'), where('status', '==', 'aberto'), where('operatorId', '==', profile.id)), (snap) => {
      const row = snap.docs[0];
      setOpenCashRegister(row ? { id: row.id, ...(row.data() as Omit<CashRegister, 'id'>) } : null);
    });
    return () => {
      unsubRows();
      unsubCash();
    };
  }, [profile]);

  const overdueCount = useMemo(() => rows.filter((item) => item.endDate && diffDaysFromNow(item.endDate) > 3).length, [rows]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await addDoc(collection(db, 'monthlyCustomers'), {
      name,
      phone,
      plate: plateMask(plate),
      vehicleType,
      model,
      amount: toInputNumber(amount),
      startDate,
      endDate,
      active: true,
      createdAt: new Date().toISOString(),
    });
    setName('');
    setPhone('');
    setPlate('');
    setVehicleType('CARRO');
    setModel('');
    setAmount('');
    setStartDate('');
    setEndDate('');
    setShowForm(false);
  }

  async function registerPayment(customer: MonthlyCustomer) {
    if (!openCashRegister) return;
    await updateDoc(doc(db, 'monthlyCustomers', customer.id), { lastPaymentDate: new Date().toISOString() });
    await updateDoc(doc(db, 'cashRegisters', openCashRegister.id), { revenueByMonthly: (openCashRegister.revenueByMonthly || 0) + (customer.amount || 0) });
  }

  return (
    <div>
      <PageHeader title="Mensalistas" subtitle="Gerenciar assinaturas mensais" actions={<button className="primary-button" onClick={() => setShowForm((v) => !v)}><Plus size={16} />Novo Mensalista</button>} />

      {showForm ? (
        <div className="panel-card mb-6 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Novo Mensalista</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreate}>
            <input className="app-input" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="app-input" placeholder="Telefone" value={phone} onChange={(e) => setPhone(phoneMask(e.target.value))} />
            <input className="app-input" placeholder="Placa" value={plate} onChange={(e) => setPlate(plateMask(e.target.value))} required />
            <select className="app-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>{vehicleTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <input className="app-input" placeholder="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
            <input className="app-input" placeholder="Valor Mensal (R$)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <input className="app-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <input className="app-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            <div className="xl:col-span-4 flex gap-3">
              <button className="primary-button" type="submit">Salvar</button>
              <button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : null}

      {rows.length ? (
        <div className="panel-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mensalistas cadastrados</h2>
              <p className="text-sm text-slate-500">{overdueCount} com atraso superior a 3 dias</p>
            </div>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Valor Mensal</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => {
                  const overdueDays = customer.endDate ? diffDaysFromNow(customer.endDate) : 0;
                  const overdue = overdueDays > 3;
                  return (
                    <tr key={customer.id} className={overdue ? 'bg-rose-50' : ''}>
                      <td>{customer.name}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.plate}</td>
                      <td>{customer.vehicleType}</td>
                      <td>{money(customer.amount)}</td>
                      <td>{shortDate(customer.startDate)}</td>
                      <td>{shortDate(customer.endDate)}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${overdue ? 'bg-rose-100 text-rose-700 danger-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                          {overdue ? `Atrasado ${overdueDays}d` : 'Ativo'}
                        </span>
                      </td>
                      <td><button className="secondary-button py-2" disabled={!openCashRegister} onClick={() => registerPayment(customer)}><CircleDollarSign size={16} />Receber</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon-soft-blue"><Users size={30} /></div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhum mensalista cadastrado.</h3>
          <p className="mt-2 text-sm text-slate-500">Clique em “Novo Mensalista” para cadastrar a primeira assinatura.</p>
        </div>
      )}
    </div>
  );
}
