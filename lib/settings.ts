import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EstablishmentSettings } from '@/types';

export async function getEstablishmentSettings(): Promise<EstablishmentSettings> {
  const snap = await getDoc(doc(db, 'settings', 'establishment'));
  if (!snap.exists()) {
    return {
      name: 'Estacionamento',
      ticketFooter: 'Nao nos responsabilizamos por objetos deixados no veiculo.',
      active: true,
    };
  }
  return snap.data() as EstablishmentSettings;
}
