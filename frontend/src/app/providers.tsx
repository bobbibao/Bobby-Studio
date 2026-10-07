import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import store from '@/store';
import { AuthProvider } from '@/common/context/useAuthContext';
import { UserModeProvider } from '@/common/context/useUserModeContext';
import theme from '@/theme';
import ToastNotification from '@/app/ToastNotification';
import CommandPalette from '@/components/common/CommandPalette';
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
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    theme="system"
                    toastOptions={{
                      style: {
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                      },
                    }}
                  />
                  <CommandPalette />
                  {children}
                </AuthProvider>
              </UserModeProvider>
            </ChakraProvider>
          </DndProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
