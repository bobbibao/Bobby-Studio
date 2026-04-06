import { auth } from '@/configs/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthUserPayload {
  token?: string;
  lastLogin?: string | null;
  hasSeenTutorial?: boolean | false;
}
const AuthContext = createContext<{ 
  user: AuthUserPayload | null; 
  loading: boolean;
  setAuthUser: (data: Partial<AuthUserPayload>) => void;
}>({
  user: null,
  loading: true,
  setAuthUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  
  const setAuthUser = (data: Partial<AuthUserPayload>) => {
    setUser((prev) => ({ ...(prev || {}), ...data } as AuthUserPayload));
  };



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setUser((prev) => ({ ...(prev || {}), token } as AuthUserPayload));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading, setAuthUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

