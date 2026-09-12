import { randomUUID } from 'node:crypto';

export class PaymentDeclinedError extends Error {
  constructor(message = 'Payment was declined') {
    super(message);
    this.name = 'PaymentDeclinedError';
  }
}

export interface ChargeParams {
  amountCents: number;
  currency: string;
}

export interface ChargeResult {
  paymentId: string;
  amountCents: number;
  currency: string;
}

export interface PaymentProvider {
  charge(params: ChargeParams): Promise<ChargeResult>;
  refund(paymentId: string): Promise<void>;
}

// Mock provider: approves instantly with a fake reference. The interface is
// the seam — a real provider implements PaymentProvider and replaces this
// object without touching checkout logic. Raw card data must never reach
// this layer; a real integration would tokenize client-side.
class MockPaymentProvider implements PaymentProvider {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    return {
      paymentId: `mock_${randomUUID()}`,
      amountCents: params.amountCents,
      currency: params.currency,
    };
  }

  async refund(): Promise<void> {
    // Nothing to settle against a mock ledger.
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
