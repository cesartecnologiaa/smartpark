import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyD7wbV9NWyBmPN_UXVigm0eRTiDPhNqSfU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'smartpark-3ef6a.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'smartpark-3ef6a',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'smartpark-3ef6a.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '745122267846',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:745122267846:web:df26eec0b5f5e259cd4dc7',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let secondaryAppInstance: FirebaseApp | null = null;

export function getSecondaryApp() {
  if (secondaryAppInstance) return secondaryAppInstance;
  secondaryAppInstance = initializeApp(firebaseConfig, 'smartpark-secondary-auth');
  return secondaryAppInstance;
}

export default app;
