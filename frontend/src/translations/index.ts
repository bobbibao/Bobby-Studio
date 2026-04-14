import i18n, { TOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

const namespaces = [
  'common',
  'profile',
  'notification',
  'aidesign',
  'favorite',
  'support',
  'generate',
  'edit',
  'tooltips',
  'history',
  'video',
  'usermanagement',
];

i18n
  .use(LanguageDetector)
  .use(
    resourcesToBackend((language, namespace, callback) => {
      // Dynamically load language files based on language and namespace
      import(`./locales/${language}/${namespace}.json`)
        .then((resources) => {
          callback(null, resources);
        })
        .catch((error) => {
          callback(error, null);
        });
    })
  )
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    ns: namespaces,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
export const translate = (key: string, options?: TOptions) => i18n.t(key, options);

