'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppUser, UserRole } from '@/types';
import { DEFAULT_TENANT_ID, normalizeTenantId } from '@/lib/tenant';

interface AuthContextType {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const rawProfile = profileSnap.data() as Omit<AppUser, 'id'>;
        const loadedProfile: AppUser = {
          id: profileSnap.id,
          ...rawProfile,
          tenantId: normalizeTenantId(rawProfile.tenantId),
        };

        if (!rawProfile.tenantId) {
          await updateDoc(profileRef, { tenantId: DEFAULT_TENANT_ID });
        }

        if (loadedProfile.active === false) {
          await signOut(auth);
          setProfile(null);
        } else {
          setProfile(loadedProfile);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('smartpark:tenantId', loadedProfile.tenantId || DEFAULT_TENANT_ID);
          }
        }
      } else {
        const isolatedTenantId = user.uid;
        const bootstrappedProfile: Omit<AppUser, 'id'> = {
          name: user.displayName || user.email?.split('@')[0] || 'Administrador',
          email: user.email || '',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          tenantId: isolatedTenantId,
        };
        await setDoc(profileRef, bootstrappedProfile, { merge: true });
        setProfile({ id: user.uid, ...bootstrappedProfile });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smartpark:tenantId', isolatedTenantId);
        }
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      firebaseUser,
      profile,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        await signOut(auth);
      },
      hasRole: (roles) => (profile ? roles.includes(profile.role) : false),
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
