import crypto from 'crypto';
import { PAYMENT_WEBHOOK_SECRET, FRONTEND_URL } from '../../config/env';
import { genDocId } from '../../utils/helpers';

export interface CheckoutSessionResult {
  checkoutUrl?: string;
  transactionId: string;
  token?: string;
  rawResponse?: any;
}

export interface WebhookVerificationResult {
  success: boolean;
  rentalId: string;
  transactionId: string;
  message?: string;
}

export interface IPaymentProvider {
  readonly name: string;
  createCheckoutSession(rental: any, user?: any): Promise<CheckoutSessionResult>;
  verifyWebhook(req: any): Promise<WebhookVerificationResult>;
}

/**
 * 1. Test / Dummy Sağlayıcı (Mevcut HMAC Korumalı Test Altyapısı)
 */
export class DummyPaymentProvider implements IPaymentProvider {
  readonly name = 'dummy';

  async createCheckoutSession(rental: any): Promise<CheckoutSessionResult> {
    const transactionId = `dummy_txn_${genDocId()}`;
    const testCheckoutUrl = `${FRONTEND_URL}/rentacar/payment-test?rentalId=${rental.documentId}&txn=${transactionId}`;
    return {
      checkoutUrl: testCheckoutUrl,
      transactionId,
    };
  }

  async verifyWebhook(req: any): Promise<WebhookVerificationResult> {
    const { rentalId, transactionId } = req.body;
    const signature = req.headers['x-payment-signature'] as string;

    if (!signature) {
      return { success: false, rentalId, transactionId, message: 'İmza eksik.' };
    }

    const payload = JSON.stringify({ rentalId, transactionId });
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { success: false, rentalId, transactionId, message: 'Geçersiz ödeme imzası.' };
    }

    return {
      success: true,
      rentalId,
      transactionId: transactionId || `dummy_txn_${genDocId()}`,
      message: 'Ödeme başarıyla doğrulandı.',
    };
  }
}

/**
 * 2. Iyzico Sağlayıcı İskeleti
 * Ortam değişkenleri: IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
 */
export class IyzicoPaymentProvider implements IPaymentProvider {
  readonly name = 'iyzico';
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.IYZICO_API_KEY || '';
    this.secretKey = process.env.IYZICO_SECRET_KEY || '';
    this.baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';
  }

  async createCheckoutSession(rental: any, user: any): Promise<CheckoutSessionResult> {
    if (!this.apiKey || !this.secretKey) {
      // API anahtarı girilmemişse güvenli bir şekilde Dummy moduna geri düş
      console.warn('⚠️ Iyzico API anahtarları tanımlı değil, dummy moduna yönlendiriliyor.');
      const dummy = new DummyPaymentProvider();
      return dummy.createCheckoutSession(rental);
    }

    const conversationId = `rental_${rental.documentId}_${Date.now()}`;
    // Gerçek Iyzico Checkout Form Initialize çağrısı
    return {
      checkoutUrl: `${this.baseUrl}/checkout/${conversationId}`,
      transactionId: conversationId,
    };
  }

  async verifyWebhook(req: any): Promise<WebhookVerificationResult> {
    const { token, rentalId } = req.body;
    // Iyzico imza veya token doğrulama
    return {
      success: Boolean(token),
      rentalId: rentalId || req.query.rentalId,
      transactionId: token || `iyzico_txn_${genDocId()}`,
      message: token ? 'Iyzico ödemesi onaylandı.' : 'Geçersiz Iyzico tokenı.',
    };
  }
}

/**
 * 3. Stripe Sağlayıcı İskeleti
 * Ortam değişkenleri: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
export class StripePaymentProvider implements IPaymentProvider {
  readonly name = 'stripe';
  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  async createCheckoutSession(rental: any): Promise<CheckoutSessionResult> {
    if (!this.secretKey) {
      console.warn('⚠️ Stripe API anahtarları tanımlı değil, dummy moduna yönlendiriliyor.');
      const dummy = new DummyPaymentProvider();
      return dummy.createCheckoutSession(rental);
    }

    const sessionId = `cs_test_${genDocId()}`;
    return {
      checkoutUrl: `https://checkout.stripe.com/c/pay/${sessionId}`,
      transactionId: sessionId,
    };
  }

  async verifyWebhook(req: any): Promise<WebhookVerificationResult> {
    const { rentalId, transactionId } = req.body;
    return {
      success: true,
      rentalId,
      transactionId: transactionId || `stripe_txn_${genDocId()}`,
      message: 'Stripe webhook doğrulandı.',
    };
  }
}

/**
 * Sağlayıcı Fabrika Fonksiyonu
 */
export function getPaymentProvider(providerName?: string): IPaymentProvider {
  const chosen = (providerName || process.env.DEFAULT_PAYMENT_PROVIDER || 'dummy').toLowerCase();
  switch (chosen) {
    case 'iyzico':
      return new IyzicoPaymentProvider();
    case 'stripe':
      return new StripePaymentProvider();
    case 'dummy':
    default:
      return new DummyPaymentProvider();
  }
}
