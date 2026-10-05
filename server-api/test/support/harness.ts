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

// ---------------------------------------------------------------------------- generation helpers

import { createHash } from 'crypto';
import * as sharp from 'sharp';
import { OutboxDispatcher } from '../../src/application/generation/outbox-dispatcher';
import { GenerationReconciler } from '../../src/application/generation/reconciler';
import { ClaimResponse, WorkerEventType, WorkerEventV1 } from '../../src/application/generation/contracts';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GENERATION_QUEUE_NAME } from '../../src/infrastructure/queue/bullmq-generation.queue';

export const dispatcherOf = (app: INestApplication) => app.get(OutboxDispatcher);
export const reconcilerOf = (app: INestApplication) => app.get(GenerationReconciler);
export const queueOf = (app: INestApplication): Queue => app.get(getQueueToken(GENERATION_QUEUE_NAME));

export async function makePng(color: { r: number; g: number; b: number }, size = 64): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: color } }).png().toBuffer();
}

export const baseRequest = (studioSessionId: string, overrides: Record<string, unknown> = {}) => ({
  studioSessionId,
  clientRevision: 1,
  intent: 'final',
  modelId: 'simulated-openai-image',
  mode: 'text_to_image',
  prompt: 'A timber house',
  size: { width: 1024, height: 1024 },
  quality: 'preview',
  ...overrides,
});

export async function createSession(app: INestApplication, user: TestUser): Promise<string> {
  const response = await as(app, user).post('/api/studio-sessions').expect(201);
  return response.body.id as string;
}

/** Plays the worker's side of the internal protocol with the real service credential. */
export class FakeWorker {
  private sequence = 0;
  attemptId = '';
  runToken = '';

  constructor(private readonly app: INestApplication) {}

  private authed(path: string) {
    return request(this.app.getHttpServer()).post(path).set('Authorization', `Bearer ${process.env.WORKER_SERVICE_SECRET}`);
  }

  async claim(jobId: string): Promise<ClaimResponse> {
    const response = await this.authed(`/api/internal/generations/${jobId}/claim`).send({}).expect(200);
    const body = response.body as ClaimResponse;
    if (body.action === 'run') {
      this.attemptId = body.attemptId;
      this.runToken = body.runToken;
      this.sequence = 0;
    }
    return body;
  }

  event<T extends WorkerEventType>(jobId: string, type: T, data: WorkerEventV1<T>['data'], overrides: Partial<WorkerEventV1> = {}) {
    const envelope: WorkerEventV1 = {
      schemaVersion: 1,
      eventId: randomUUID(),
      jobId,
      attemptId: this.attemptId,
      runToken: this.runToken,
      sequence: ++this.sequence,
      type,
      occurredAt: new Date().toISOString(),
      data,
      ...overrides,
    } as WorkerEventV1;
    return this.authed(`/api/internal/generations/${jobId}/events`).send(envelope);
  }

  /** Same envelope sent again, exactly as a delivery retry would. */
  resend(jobId: string, envelope: WorkerEventV1) {
    return this.authed(`/api/internal/generations/${jobId}/events`).send(envelope);
  }

  async outputs(jobId: string) {
    const bytes = await makePng({ r: 10, g: 120, b: 200 }, 32);
    return [
      {
        storageKey: `generated/${jobId}/0.png`,
        mimeType: 'image/png',
        byteSize: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        width: 32,
        height: 32,
      },
    ];
  }
}
