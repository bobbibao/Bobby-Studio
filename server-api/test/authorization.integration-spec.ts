import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import { anonymous, as, createTestApp, createUser, prismaOf, signIn, TestUser } from './support/harness';

describe('identity and ownership', () => {
  let app: INestApplication;
  let alice: TestUser;
  let bob: TestUser;
  let aliceJobId: string;

  beforeAll(async () => {
    app = await createTestApp();
    alice = await createUser('alice');
    bob = await createUser('bob');
    await Promise.all([signIn(app, alice), signIn(app, bob)]);

    // A job owned by Alice, created directly so the test does not depend on the queue.
    const prisma = prismaOf(app);
    const request = await prisma.imageRequest.create({
      data: { userId: alice.uid, method: 'text_to_image', parameters: {}, status: 'QUEUED' },
    });
    const job = await prisma.imageJob.create({
      data: {
        requestId: request.id,
        userId: alice.uid,
        modelName: 'simulated-openai-image',
        provider: 'openai',
        status: 'FAILED',
        errorCode: 'INTERNAL',
        payload: { modelId: 'simulated-openai-image', mode: 'text_to_image', prompt: 'p', size: { width: 1024, height: 1024 }, quality: 'preview', inputAssetId: null, inputHash: 'h' },
      },
    });
    aliceJobId = job.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it.each(['/api/models', '/api/projects/user/anyone', '/api/generations', '/api/credits/balance', '/api/users/profile'])(
      'rejects anonymous access to %s',
      async (url) => {
        await anonymous(app).get(url).expect(401);
      },
    );

    it('rejects forged bearer tokens and the removed bypass headers', async () => {
      await anonymous(app).get('/api/models').set('Authorization', 'Bearer forged.token.value').expect(401);
      await anonymous(app)
        .get('/api/models')
        .set('bypass_api_token', 'anything')
        .set('bypass_api_user_id', alice.uid)
        .expect(401);
    });

    it('provisions an account from a verified token without storing a password', async () => {
      const user = await prismaOf(app).user.findUnique({ where: { id: alice.uid } });
      expect(user?.email).toBe(alice.email);
      expect(user?.password).toBeNull();
    });

    it('keeps health public and the removed password endpoints gone', async () => {
      await anonymous(app).get('/api/health/live').expect(200);
      await anonymous(app).post('/api/auth/sign-in').send({}).expect(404);
    });

    it('refuses a deactivated account', async () => {
      const carol = await createUser('carol');
      await signIn(app, carol);
      await prismaOf(app).user.update({ where: { id: carol.uid }, data: { isActive: false } });
      await as(app, carol).get('/api/models').expect(403);
    });
  });

  describe("another user's job", () => {
    it.each([
      ['read', 'get', (id: string) => `/api/generations/${id}`],
      ['cancel', 'post', (id: string) => `/api/generations/${id}/cancel`],
      ['retry', 'post', (id: string) => `/api/generations/${id}/retry`],
      ['save', 'post', (id: string) => `/api/generations/${id}/save`],
    ] as const)('does not disclose or mutate it through %s', async (_name, method, url) => {
      await as(app, bob)[method](url(aliceJobId)).set('Idempotency-Key', randomUUID()).expect(404);
      const job = await prismaOf(app).imageJob.findUnique({ where: { id: aliceJobId } });
      expect(job?.status).toBe('FAILED');
    });

    it("never lists another user's generations", async () => {
      const page = await as(app, bob).get('/api/generations').expect(200);
      expect(page.body.items.map((item: { id: string }) => item.id)).not.toContain(aliceJobId);
      const own = await as(app, alice).get('/api/generations?studioSessionId=00000000-0000-4000-8000-000000000000').expect(200);
      expect(own.body.items).toEqual([]);
    });
  });

  describe('projects and library', () => {
    it('ignores a forged userId and stores the project under the caller', async () => {
      const response = await as(app, bob)
        .post('/api/projects')
        .send({ userId: alice.uid, projects: [{ title: 'Bob project', type: 'Project', folders: [] }] });
      expect(response.status).toBeLessThan(300);
      const aliceOwned = await prismaOf(app).userAttribute.count({ where: { userId: alice.uid } });
      const bobOwned = await prismaOf(app).userAttribute.count({ where: { userId: bob.uid } });
      expect(aliceOwned).toBe(0);
      expect(bobOwned).toBe(1);
    });

    it("cannot overwrite another user's project by id", async () => {
      const created = await as(app, alice)
        .post('/api/projects')
        .send({ projects: [{ title: 'Alice project', type: 'Project', folders: [] }] })
        .expect(201);
      const projectId = created.body[0].attributeId;
      await as(app, bob)
        .post('/api/projects')
        .send({ projects: [{ id: projectId, title: 'Hijacked', type: 'Project', folders: [] }] })
        .expect(404);
    });

    it('answers a mismatched user id in the path as a missing resource', async () => {
      await as(app, bob).get(`/api/projects/user/${alice.uid}`).expect(404);
      await as(app, bob).get(`/api/attributes/uploads/${alice.uid}`).expect(404);
      await as(app, bob).get(`/api/attributes/history/${alice.uid}`).expect(404);
      await as(app, alice).get(`/api/projects/user/${alice.uid}`).expect(200);
    });

    it("does not reveal the prompt of someone else's unpublished image", async () => {
      const attributeId = randomUUID();
      await prismaOf(app).attribute.create({
        data: { id: attributeId, version: randomUUID(), type: 'Generated_Image', value: {}, actions: { prompt: 'secret' } },
      });
      await prismaOf(app).userAttribute.create({ data: { userId: alice.uid, attributeId } });
      await as(app, bob).get(`/api/attributes/${attributeId}/actions`).expect(404);
      await as(app, alice).get(`/api/attributes/${attributeId}/actions`).expect(200);
    });

    it('limits publishing to administrators', async () => {
      await as(app, bob).patch('/api/attributes/versions/publish').send({ ids: [randomUUID()], isPublished: true }).expect(403);
      await as(app, bob).patch('/api/attributes/versions/publish-all').send({ isPublished: true }).expect(403);
    });

    it("cannot read or delete someone else's notification", async () => {
      const note = await prismaOf(app).notification.create({
        data: { userId: alice.uid, type: 'info', title: 't', message: 'm' },
      });
      await as(app, bob).patch(`/api/notifications/${note.id}/read`).expect(404);
      await as(app, bob).delete(`/api/notifications/${note.id}`).expect(404);
      expect(await prismaOf(app).notification.count({ where: { id: note.id, isRead: false } })).toBe(1);
      await as(app, alice).patch(`/api/notifications/${note.id}/read`).expect(200);
    });
  });

  describe('worker credentials', () => {
    it.each([
      ['no credential', undefined],
      ['a wrong credential', 'Bearer not-the-worker-secret'],
      ['a user ID token', 'Bearer USER_TOKEN'],
    ])('rejects claim and event calls with %s', async (_name, header) => {
      for (const route of ['claim', 'events']) {
        const req = anonymous(app).post(`/api/internal/generations/${aliceJobId}/${route}`).send({});
        if (header) req.set('Authorization', header.replace('USER_TOKEN', alice.token));
        await req.expect(401);
      }
    });

    it('accepts the service credential at the guard and validates the payload before any effect', async () => {
      const response = await anonymous(app)
        .post(`/api/internal/generations/${aliceJobId}/events`)
        .set('Authorization', `Bearer ${process.env.WORKER_SERVICE_SECRET}`)
        .send({ schemaVersion: 2 });
      expect(response.status).toBe(400);
    });
  });

  describe('realtime', () => {
    let socketApp: INestApplication;
    let url: string;
    const sockets: Socket[] = [];

    const connect = (auth?: { token: string }): Promise<Socket> =>
      new Promise((resolve) => {
        const socket = io(url, { auth, transports: ['websocket'], reconnection: false, forceNew: true });
        sockets.push(socket);
        socket.once('authenticated', () => resolve(socket));
        socket.once('authError', () => resolve(socket));
        socket.once('disconnect', () => resolve(socket));
      });

    beforeAll(async () => {
      socketApp = await createTestApp();
      await socketApp.listen(0);
      url = `http://127.0.0.1:${(socketApp.getHttpServer().address() as AddressInfo).port}`;
    });

    afterAll(async () => {
      sockets.forEach((socket) => socket.close());
      await socketApp.close();
    });

    it('disconnects sockets without valid credentials', async () => {
      const none = await connect();
      await new Promise((r) => setTimeout(r, 300));
      expect(none.connected).toBe(false);
      const forged = await connect({ token: 'forged.token.value' });
      await new Promise((r) => setTimeout(r, 300));
      expect(forged.connected).toBe(false);
    });

    it("refuses to join another user's job room and allows the owner", async () => {
      const bobSocket = await connect({ token: bob.token });
      const aliceSocket = await connect({ token: alice.token });
      expect(bobSocket.connected && aliceSocket.connected).toBe(true);

      const outcome = (socket: Socket) =>
        new Promise<string>((resolve) => {
          socket.once('roomJoined', () => resolve('joined'));
          socket.once('roomError', () => resolve('refused'));
          socket.emit('joinRoom', aliceJobId);
        });
      expect(await outcome(bobSocket)).toBe('refused');
      expect(await outcome(aliceSocket)).toBe('joined');
    });
  });
});
