import { getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { EstablishmentSettings } from '@/types';

export async function getEstablishmentSettings(tenantId?: string | null): Promise<EstablishmentSettings> {
  const snap = await getDoc(tenantDoc(db, tenantId, 'settings', 'establishment'));
  if (!snap.exists()) {
    return {
      name: 'Estacionamento',
      ticketFooter: 'Nao nos responsabilizamos por objetos deixados no veiculo.',
      active: true,
    };
  }
  return snap.data() as EstablishmentSettings;
}
