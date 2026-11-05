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
 * Gerçek sağlayıcılar için ortak taban.
 * Entegrasyon eklenene kadar (API anahtarları + resmi SDK ile imza doğrulama)
 * checkout başlatmaz ve webhook'ları ASLA başarılı saymaz.
 */
abstract class NotConfiguredProvider implements IPaymentProvider {
  abstract readonly name: string;
  protected abstract isConfigured(): boolean;

  async createCheckoutSession(_rental: any, _user?: any): Promise<CheckoutSessionResult> {
    throw new Error(
      this.isConfigured()
        ? `${this.name} entegrasyonu henüz uygulanmadı.`
        : `${this.name} API anahtarları tanımlı değil.`
    );
  }

  async verifyWebhook(req: any): Promise<WebhookVerificationResult> {
    return {
      success: false,
      rentalId: req.body?.rentalId,
      transactionId: '',
      message: `${this.name} webhook doğrulaması henüz uygulanmadı.`,
    };
  }
}

/**
 * 2. Iyzico Sağlayıcı İskeleti
 * Ortam değişkenleri: IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
 * TODO(entegrasyon): Checkout Form Initialize + CheckoutForm Retrieve ile token doğrulama.
 */
export class IyzicoPaymentProvider extends NotConfiguredProvider {
  readonly name = 'iyzico';
  protected isConfigured() {
    return Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);
  }
}

/**
 * 3. Stripe Sağlayıcı İskeleti
 * Ortam değişkenleri: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * TODO(entegrasyon): checkout.sessions.create + webhooks.constructEvent (raw body gerekir).
 */
export class StripePaymentProvider extends NotConfiguredProvider {
  readonly name = 'stripe';
  protected isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }
}

/**
 * Sağlayıcı Fabrika Fonksiyonu
 * Aktif sağlayıcı tek noktadan, sunucu ortam değişkeniyle belirlenir (PAYMENT_PROVIDER).
 * İstemciden gelen sağlayıcı adı dikkate alınmaz; böylece doğrulaması zayıf bir
 * sağlayıcı dışarıdan seçilemez.
 */
export function getPaymentProvider(_requested?: string): IPaymentProvider {
  const chosen = (process.env.PAYMENT_PROVIDER || process.env.DEFAULT_PAYMENT_PROVIDER || 'dummy').toLowerCase();
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