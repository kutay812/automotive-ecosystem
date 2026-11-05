import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

const TEST_SECRET = new TextEncoder().encode('visionarc-test-admin-secret-2026');
const WRONG_SECRET = new TextEncoder().encode('wrong-attacker-secret-2026');

describe('VisionArc Frontend Admin JWT ve Proxy Güvenlik Testleri', () => {
  it('Geçerli HMAC-SHA256 imzalı admin token doğrulanır ve rol bilgisini taşır', async () => {
    const token = await new SignJWT({
      adminId: 1,
      documentId: 'adm_doc_1',
      email: 'admin@visionarc.test',
      role: 'superadmin',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(TEST_SECRET);

    const { payload } = await jwtVerify(token, TEST_SECRET);
    assert.equal(payload.adminId, 1);
    assert.equal(payload.role, 'superadmin');
    assert.equal(payload.email, 'admin@visionarc.test');
  });

  it('S7 Regresyonu: İmzası doğrulanmamış sahte base64 token (alg:none / sahte imza) reddedilir', async () => {
    const fakeHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const fakePayload = Buffer.from(
      JSON.stringify({ adminId: 1, role: 'superadmin', exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');
    const forgedToken = `${fakeHeader}.${fakePayload}.sahte_imza_verisi`;

    await assert.rejects(() => jwtVerify(forgedToken, TEST_SECRET));
  });

  it('Farklı anahtarla imzalanmış veya süresi dolmuş admin token reddedilir', async () => {
    const wrongKeyToken = await new SignJWT({ adminId: 1, role: 'superadmin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(WRONG_SECRET);

    await assert.rejects(() => jwtVerify(wrongKeyToken, TEST_SECRET));

    const expiredToken = await new SignJWT({ adminId: 1, role: 'superadmin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(TEST_SECRET);

    await assert.rejects(() => jwtVerify(expiredToken, TEST_SECRET));
  });
});

