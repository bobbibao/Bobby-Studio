import { randomUUID } from 'crypto';

const EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'demo-bobby-studio';
const identityToolkit = (path: string) => `http://${EMULATOR}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`;

export interface E2EUser {
  email: string;
  password: string;
  uid: string;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Auth Emulator call failed (${response.status}): ${await response.text()}`);
  return (await response.json()) as T;
}

/**
 * Creates an account in the official Auth Emulator and verifies its email through the emulator's
 * own out-of-band code flow, exactly as a user clicking the verification link would.
 */
export async function createVerifiedUser(label: string): Promise<E2EUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = 'Passw0rd!e2e-test';
  const created = await post<{ idToken: string; localId: string }>(identityToolkit('accounts:signUp'), {
    email,
    password,
    returnSecureToken: true,
  });
  await post(identityToolkit('accounts:sendOobCode'), { requestType: 'VERIFY_EMAIL', idToken: created.idToken });
  const codes = (await (await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()) as {
    oobCodes: Array<{ email: string; requestType: string; oobCode: string }>;
  };
  const code = codes.oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').at(-1);
  if (!code) throw new Error('Emulator did not issue a verification code');
  await post(identityToolkit('accounts:update'), { oobCode: code.oobCode });
  return { email, password, uid: created.localId };
}
