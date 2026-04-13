"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getDoc, setDoc } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { useAuth } from '@/contexts/AuthContext';
import { EstablishmentSettings } from '@/types';

const supportUrl = `https://api.whatsapp.com/send/?phone=5533999675619&text=${encodeURIComponent('Olá! Preciso de suporte no sistema SmartPark.')}`;

type PrinterWidth = '80mm' | '58mm';
type PrintMethod = 'browser' | 'rawbt';
type ChargeMode = 'fracionado' | 'integral';

export default function ConfiguracoesPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<EstablishmentSettings>({
    name: 'SmartPark',
    active: true,
    ticketFooter: 'Nao nos responsabilizamos por objetos deixados no veiculo.',
    phone: '',
    address: '',
    document: '',
    printerWidth: '80mm',
    printMethod: 'browser',
    chargeMode: 'fracionado',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const ref = tenantDoc(db, profile?.tenantId, 'settings', 'establishment');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const loadedSettings = {
          ...settings,
          ...(snap.data() as EstablishmentSettings),
          printerWidth:
            (snap.data() as EstablishmentSettings).printerWidth || '80mm',
          printMethod:
            (snap.data() as EstablishmentSettings).printMethod || 'browser',
          chargeMode:
            (snap.data() as EstablishmentSettings).chargeMode || 'fracionado',
        };

        setSettings(loadedSettings);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smartpark:printerWidth', loadedSettings.printerWidth || '80mm');
          window.localStorage.setItem('smartpark:printMethod', loadedSettings.printMethod || 'browser');
        }
      }
    }
    load();
  }, [profile?.tenantId]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await setDoc(tenantDoc(db, profile?.tenantId, 'settings', 'establishment'), settings, { merge: true });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('smartpark:printerWidth', settings.printerWidth || '80mm');
      window.localStorage.setItem('smartpark:printMethod', settings.printMethod || 'browser');
    }

    setMessage('Configurações salvas com sucesso.');
  }

  const statusValue = useMemo(
    () => (settings.active ? 'ativo' : 'inativo'),
    [settings.active]
  );

  return (
    <div className="relative">
      <PageHeader title="Configurações" subtitle="Dados principais do estabelecimento" />

      <div className="panel-card p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveSettings}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nome do Estabelecimento
            </label>
            <input
              className="app-input"
              value={settings.name || ''}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              placeholder="SmartPark"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Telefone
            </label>
            <input
              className="app-input"
              value={settings.phone || ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              placeholder="(33) 99999-9999"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Endereço
            </label>
            <input
              className="app-input"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="Rua, número, bairro e cidade"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              CNPJ
            </label>
            <input
              className="app-input"
              value={settings.document || ''}
              onChange={(e) => setSettings({ ...settings, document: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              className="app-input"
              value={statusValue}
              onChange={(e) => setSettings({ ...settings, active: e.target.value === 'ativo' })}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Largura da Impressora
            </label>
            <select
              className="app-input"
              value={settings.printerWidth || '80mm'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  printerWidth: e.target.value as PrinterWidth,
                })
              }
            >
              <option value="80mm">80mm</option>
              <option value="58mm">58mm</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Método de Impressão
            </label>
            <select
              className="app-input"
              value={settings.printMethod || 'browser'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  printMethod: e.target.value as PrintMethod,
                })
              }
            >
              <option value="browser">Navegador Padrão</option>
              <option value="rawbt">Android / RAWBT</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Use RAWBT em celulares Android com impressora térmica Bluetooth.
            </p>
          </div>


          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Forma de Cobrança
            </label>
            <select
              className="app-input"
              value={settings.chargeMode || 'fracionado'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  chargeMode: e.target.value as ChargeMode,
                })
              }
            >
              <option value="fracionado">Valor fracionado</option>
              <option value="integral">Valor integral por hora</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Fracionado cobra por blocos de 15 minutos. Integral cobra a hora cheia e horas adicionais completas.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Rodapé do Ticket
            </label>
            <textarea
              className="app-textarea"
              value={settings.ticketFooter || ''}
              onChange={(e) => setSettings({ ...settings, ticketFooter: e.target.value })}
              placeholder="Texto exibido no rodapé dos cupons"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button className="primary-button" type="submit">
              Salvar Alterações
            </button>
          </div>
        </form>

        {message ? <p className="mt-4 text-sm text-blue-700">{message}</p> : null}
      </div>

      <button
        type="button"
        className="support-float-button"
        onClick={() => window.open(supportUrl, '_blank')}
        aria-label="Suporte pelo WhatsApp"
      >
        <MessageCircle size={20} />
        <span>Suporte</span>
      </button>
    </div>
  );
}