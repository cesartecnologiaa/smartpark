import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/tenant';
import { PriceSetting, VehicleType } from '@/types';

const defaults: Record<VehicleType, Omit<PriceSetting, 'id'>> = {
  CARRO: { vehicleType: 'CARRO', valorHora: 12, valorAdicional: 8, tolerancia: 0 },
  MOTO: { vehicleType: 'MOTO', valorHora: 8, valorAdicional: 5, tolerancia: 0 },
  CAMINHONETE: { vehicleType: 'CAMINHONETE', valorHora: 15, valorAdicional: 10, tolerancia: 0 },
  CAMINHAO: { vehicleType: 'CAMINHAO', valorHora: 22, valorAdicional: 15, tolerancia: 0 },
};

export async function seedPriceSettings(tenantId?: string | null, force = false) {
  const entries = Object.values(defaults);

  await Promise.all(
    entries.map(async (row) => {
      const ref = tenantDoc(db, tenantId, 'priceSettings', row.vehicleType);
      const snap = await getDoc(ref);
      if (!force && snap.exists()) return;
      await setDoc(ref, {
        ...row,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      });
    })
  );
}
