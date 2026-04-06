import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import store from '@/store';
import { AuthProvider } from '@/common/context/useAuthContext';
import { UserModeProvider } from '@/common/context/useUserModeContext';
import { JobSocketProvider } from '@/common/context/useJobSocketContext';
import theme from '@/theme';
import ToastNotification from '@/app/ToastNotification';
import '@/translations';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DndProvider backend={HTML5Backend}>
            <ChakraProvider theme={theme}>
              <UserModeProvider>
                <AuthProvider>
                  <ToastNotification />
                  <JobSocketProvider>{children}</JobSocketProvider>
                </AuthProvider>
              </UserModeProvider>
            </ChakraProvider>
          </DndProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

