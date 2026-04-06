import React, { createContext, useContext } from 'react';
import { useJobSocket } from '@/hooks/useJobSocket';

const JobSocketContext = createContext<ReturnType<typeof useJobSocket> | null>(null);

export const JobSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socket = useJobSocket({
    trackHistoryJobs: true,
    autoJoinActiveJobs: true,
  });
  return <JobSocketContext.Provider value={socket}>{children}</JobSocketContext.Provider>;
};

export const useJobSocketContext = () => {
  const context = useContext(JobSocketContext);
  if (!context) {
    throw new Error('useJobSocketContext must be used within a JobSocketProvider');
  }
  return context;
};

