import * as admin from 'firebase-admin';
import { RuntimeConfig } from './runtime-config';

type Env = Record<string, string | undefined>;

/**
 * Initializes the single Firebase Admin app.
 *
 * - Development and test use the official Firebase Authentication Emulator: the Admin SDK
 *   reads FIREBASE_AUTH_EMULATOR_HOST and verifies emulator-issued ID tokens through the
 *   normal verifyIdToken path.
 * - Staging and production prefer Application Default Credentials. Existing service-account
 *   environment variables remain supported for deployments that already provide them.
 */
export function initializeFirebaseAdmin(config: RuntimeConfig, env: Env = process.env): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const { projectId, credentialSource, authEmulatorHost } = config.firebase;

  if (credentialSource === 'emulator') {
    // The Admin SDK discovers the emulator through this variable at call time.
    process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
    return admin.initializeApp({ projectId });
  }

  if (credentialSource === 'service-account') {
    const serviceAccount = {
      projectId,
      clientEmail: env.CLIENT_EMAIL,
      privateKey: env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount;
    return admin.initializeApp({ projectId, credential: admin.credential.cert(serviceAccount) });
  }

  return admin.initializeApp({ projectId, credential: admin.credential.applicationDefault() });
}
