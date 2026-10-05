import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { configureApp } from '../../src/app/configure-app';
import { initializeFirebaseAdmin } from '../../src/config/firebase-admin';
import { loadRuntimeConfig } from '../../src/config/runtime-config';
import { PrismaService } from '../../prisma/prisma.service';

export interface TestUser {
  uid: string;
  email: string;
  token: string;
}

export async function createTestApp(): Promise<INestApplication> {
  const config = loadRuntimeConfig();
  initializeFirebaseAdmin(config);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app, config);
  await app.init();
  return app;
}

/** Signs a new user up through the real Firebase Auth Emulator REST API and returns an ID token. */
export async function createUser(label = 'user'): Promise<TestUser> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Passw0rd!integration', returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Auth Emulator sign-up failed (${response.status}); is it running?`);
  const body = (await response.json()) as { idToken: string; localId: string };
  return { uid: body.localId, email, token: body.idToken };
}

export const as = (app: INestApplication, user: TestUser) => ({
  get: (url: string) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${user.token}`),
  post: (url: string) => request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${user.token}`),
  put: (url: string) => request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${user.token}`),
  patch: (url: string) => request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${user.token}`),
  delete: (url: string) => request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${user.token}`),
});

export const anonymous = (app: INestApplication) => request(app.getHttpServer());

/** Provisions the account row (first authenticated request) so tests can seed data for it. */
export async function signIn(app: INestApplication, user: TestUser): Promise<void> {
  await as(app, user).post('/api/auth/session').expect(200);
}

export const prismaOf = (app: INestApplication): PrismaService => app.get(PrismaService);
