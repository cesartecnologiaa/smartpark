import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function randomShortTicket() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function generateUniqueShortTicket() {
  for (let i = 0; i < 20; i += 1) {
    const candidate = randomShortTicket();
    const snap = await getDocs(
      query(collection(db, 'parkingTickets'), where('shortTicket', '==', candidate), limit(1))
    );
    if (snap.empty) return candidate;
  }
  return randomShortTicket();
}
