import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Server } from 'node:http';

// Test ortamını statik olmayan modül yüklemesinden önce işaretle (Windows ve Linux uyumlu)
process.env.NODE_ENV = 'test';

describe('VisionArc Backend Güvenlik, Regresyon ve Smoke Testleri', () => {
  let server: Server;
  let baseUrl = '';
  let pool: any;
  let redis: any;
  let originalPoolQuery: any;
  let helpers: any;
  let uploadMod: any;
  let paymentMod: any;
  let envMod: any;

  before(async () => {
    const dbMod = await import('../database/db');
    const redisMod = await import('../config/redis');
    helpers = await import('../utils/helpers');
    uploadMod = await import('../middlewares/upload');
    paymentMod = await import('../services/payment/PaymentProvider');
    envMod = await import('../config/env');
    const appMod = await import('../index');

    pool = dbMod.pool;
    redis = redisMod.redis;
    originalPoolQuery = pool.query.bind(pool);

    await new Promise<void>((resolve) => {
      server = appMod.default.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (pool && originalPoolQuery) {
      pool.query = originalPoolQuery;
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (redis) {
      redis.disconnect();
    }
    if (pool) {
      await pool.end().catch(() => {});
    }
  });

  it('Sağlık kontrolü (/api/health) 200 döner ve Helmet güvenlik başlıklarını içerir', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('x-frame-options') || res.headers.get('content-security-policy'));
  });

  it('S1 Regresyonu: Eski ?secret= parametresi admin uçlarında yetki vermez (401)', async () => {
    const resList = await fetch(`${baseUrl}/api/rental-operations/admin/all?secret=example-secret-google-123`);
    assert.equal(resList.status, 401);

    const resApprove = await fetch(`${baseUrl}/api/rental-operations/admin/approve?secret=example-secret-google-123`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId: 'doc_123' }),
    });
    assert.equal(resApprove.status, 401);
  });

  it('S2 Regresyonu: /api/cars yazma uçları yetkisiz istekleri reddeder (401/403)', async () => {
    for (const method of ['POST', 'PUT', 'DELETE'] as const) {
      const url = method === 'POST' ? `${baseUrl}/api/cars` : `${baseUrl}/api/cars/doc_test_1`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify({ data: { brand: 'Test' } }),
      });
      assert.equal(res.status, 401, `${method} /api/cars yetkisiz istek 401 dönmeli`);
    }
  });

  it('S3 Regresyonu: GET /api/rentals ucu kullanıcı kişisel verilerini (PII) sızdırmaz', async () => {
    pool.query = async () => ({
      rows: [
        {
          id: 10,
          document_id: 'rent_doc_10',
          rental_status: 'aktif',
          pickup_office: 'Merkez',
          dropoff_office: 'Havalimanı',
          start_date: '2026-06-01T10:00:00.000Z',
          end_date: '2026-06-05T10:00:00.000Z',
          requested_end_date: null,
          payment_method: 'online',
          payment_status: 'paid',
          approval_status: 'approved',
          car_id: 42,
          car_document_id: 'car_doc_42',
          car_brand: 'BMW',
          car_model: '320i',
          user_id: 99,
          user_document_id: 'user_doc_99',
          user_email: 'gizli@example.com',
          user_phone_number: '+905551112233',
          user_first_name: 'Ahmet',
          user_last_name: 'Yılmaz',
        },
      ],
    });

    try {
      const res = await fetch(`${baseUrl}/api/rentals`);
      assert.equal(res.status, 200);
      const payload = await res.json();
      assert.equal(payload.data.length, 1);

      const item = payload.data[0];
      assert.deepEqual(item.car, { id: 42 });
      assert.equal(item.rentalStatus, 'aktif');
      assert.equal(item.startDate, '2026-06-01T10:00:00.000Z');
      assert.equal(item.endDate, '2026-06-05T10:00:00.000Z');

      // Hassas alanların kesinlikle bulunmadığını doğrula
      assert.equal('user' in item, false);
      assert.equal('pickupOffice' in item, false);
      const serialized = JSON.stringify(payload);
      assert.equal(serialized.includes('gizli@example.com'), false);
      assert.equal(serialized.includes('+905551112233'), false);
      assert.equal(serialized.includes('Ahmet'), false);
    } finally {
      pool.query = originalPoolQuery;
    }
  });

  it('S4 Regresyonu: Ödeme sağlayıcıları sahte webhook kabul etmez ve istemci sağlayıcı seçemez', async () => {
    const { DummyPaymentProvider, StripePaymentProvider, IyzicoPaymentProvider, getPaymentProvider } = paymentMod;

    // Stripe ve Iyzico iskeletleri asla sahte başarı dönmez
    const stripe = new StripePaymentProvider();
    const iyzico = new IyzicoPaymentProvider();

    const stripeVerify = await stripe.verifyWebhook({ body: { rentalId: 'r1' }, headers: {} });
    assert.equal(stripeVerify.success, false);

    const iyzicoVerify = await iyzico.verifyWebhook({ body: { rentalId: 'r1', token: 'any-non-empty-token' }, headers: {} });
    assert.equal(iyzicoVerify.success, false);

    await assert.rejects(() => stripe.createCheckoutSession({ documentId: 'r1' }));
    await assert.rejects(() => iyzico.createCheckoutSession({ documentId: 'r1' }));

    // İstemciden gelen 'stripe' parametresi sunucu ayarını ezemez
    const prevProvider = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = 'dummy';
    try {
      const resolved = getPaymentProvider('stripe');
      assert.equal(resolved.name, 'dummy');
    } finally {
      if (prevProvider === undefined) delete process.env.PAYMENT_PROVIDER;
      else process.env.PAYMENT_PROVIDER = prevProvider;
    }

    // Dummy sağlayıcı HMAC doğrulaması
    const dummy = new DummyPaymentProvider();
    const badSig = await dummy.verifyWebhook({
      body: { rentalId: 'r1', transactionId: 'tx1' },
      headers: { 'x-payment-signature': 'invalid_hex' },
    });
    assert.equal(badSig.success, false);

    const validSig = crypto
      .createHmac('sha256', envMod.PAYMENT_WEBHOOK_SECRET)
      .update(JSON.stringify({ rentalId: 'r1', transactionId: 'tx1' }))
      .digest('hex');
    const goodSig = await dummy.verifyWebhook({
      body: { rentalId: 'r1', transactionId: 'tx1' },
      headers: { 'x-payment-signature': validSig },
    });
    assert.equal(goodSig.success, true);
  });

  it('S5 Regresyonu: Upload whitelist tehlikeli uzantıları (.svg, .html) reddeder ve boyut limitini uygular', async () => {
    const { isAllowedUpload, MAX_UPLOAD_BYTES } = uploadMod;
    assert.equal(isAllowedUpload('arac.webp'), true);
    assert.equal(isAllowedUpload('tanitim.mp4'), true);
    assert.equal(isAllowedUpload('katalog.pdf'), true);
    assert.equal(isAllowedUpload('xss.svg'), false);
    assert.equal(isAllowedUpload('exploit.html'), false);
    assert.equal(isAllowedUpload('shell.php'), false);

    // Admin JWT üret
    const adminToken = helpers.signAdminToken({
      id: 1,
      document_id: 'adm_1',
      email: 'admin@visionarc.test',
      role: 'superadmin',
      first_name: 'Test',
      last_name: 'Admin',
    });

    // 1) Yasaklı uzantı (.svg) yükleme denemesi -> 400
    const boundary = '----VisionArcTestBoundary123';
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="xss.svg"',
      'Content-Type: image/svg+xml',
      '',
      '<svg onload="alert(1)"></svg>',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const badExtRes = await fetch(`${baseUrl}/api/admin/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });
    assert.equal(badExtRes.status, 400);

    // 2) Sınırı aşan Content-Length bildirimi -> 413
    const oversizeRes = await fetch(`${baseUrl}/api/admin/projects/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Test-Declared-Size': String(MAX_UPLOAD_BYTES + 1024),
      },
      body: '',
    });
    // Boş gövdede boundary/dosya eksikliği 400 döner; uploadSizeGuard doğrudan birim testi ile de doğrulanır:
    assert.equal(oversizeRes.status, 400);

    let guardStatus = 0;
    uploadMod.uploadSizeGuard(
      { headers: { 'content-length': String(MAX_UPLOAD_BYTES + 1) }, on: () => {} },
      {
        status(code: number) {
          guardStatus = code;
          return { json: () => {} };
        },
      },
      () => {}
    );
    assert.equal(guardStatus, 413);
  });

  it('Faz 4 Regresyonu: buildUpdateQuery parametreli SQL üretir ve geçersiz sütun adlarını engeller', () => {
    const { buildUpdateQuery } = helpers;

    const q = buildUpdateQuery(
      'cars',
      { brand: 'Mercedes', price_per_day: 3500, ignored_col: undefined },
      'document_id = $1',
      ['car_doc_1']
    );

    assert.equal(
      q.text,
      'UPDATE cars SET updated_at = $1, brand = $2, price_per_day = $3 WHERE document_id = $4'
    );
    assert.equal(q.values.length, 4);
    assert.equal(q.values[1], 'Mercedes');
    assert.equal(q.values[2], 3500);
    assert.equal(q.values[3], 'car_doc_1');

    assert.throws(() => {
      buildUpdateQuery('cars', { 'brand = 1; DROP TABLE cars; --': 'x' }, 'id = $1', [1]);
    }, /Geçersiz sütun adı/);
  });
});

