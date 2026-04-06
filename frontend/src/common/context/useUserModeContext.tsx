// context/UserModeContext.tsx
import { createContext, useContext, useState } from 'react';

type Mode = 'normal' | 'workspace';

interface UserModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export const UserModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<Mode>('normal');

  return (
    <UserModeContext.Provider value={{ mode, setMode }}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = () => {
  const context = useContext(UserModeContext);
  if (!context) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
};

