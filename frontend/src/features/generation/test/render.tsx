import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@/translations/locales/en/studio.json';
import theme from '@/theme';

export function createTestI18n() {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['studio'],
    defaultNS: 'studio',
    resources: { en: { studio: en } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

/** Chakra theme + i18n (English studio namespace) + Query client, as the app provides them. */
export function renderStudio(ui: ReactElement, queryClient: QueryClient = createTestQueryClient()): RenderResult {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <I18nextProvider i18n={createTestI18n()}>{ui}</I18nextProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
