import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const env = import.meta.env;

const REQUIRED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_AUTH_DOMAIN'] as const;
const missing = REQUIRED.filter((name) => !env[name]);
if (missing.length > 0) {
  // Fail closed: there is no anonymous or substitute identity.
  throw new Error(`Firebase is not configured. Missing: ${missing.join(', ')}`);
}

const emulatorUrl: string | undefined = env.VITE_FIREBASE_AUTH_EMULATOR_URL || undefined;
if (emulatorUrl && !env.DEV) {
  throw new Error('The Firebase Auth Emulator must not be configured in a production bundle.');
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
});

export const auth: Auth = getAuth(app);
if (emulatorUrl) {
  // Official Firebase Authentication Emulator for local development and CI.
  connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
}

export const googleProvider = new GoogleAuthProvider();
