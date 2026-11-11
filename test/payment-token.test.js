import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCaptureToken, verifyCaptureToken } from '../lib/payment-token';

const SECRET = 'test-payment-token-secret-1234567890';

beforeAll(() => {
  process.env.PAYMENT_TOKEN_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.PAYMENT_TOKEN_SECRET;
});

describe('capture tokens', () => {
  it('round-trips a token for the expected order', async () => {
    const token = await createCaptureToken({
      orderId: 'ORDER123',
      serviceId: 'grooming',
      deposit: 16.5,
      bookingId: 'booking-1',
    });

    const payload = await verifyCaptureToken(token, 'ORDER123');
    expect(payload).toMatchObject({
      orderId: 'ORDER123',
      serviceId: 'grooming',
      deposit: '16.50',
      bookingId: 'booking-1',
    });
  });

  it('rejects a token used with a different order', async () => {
    const token = await createCaptureToken({
      orderId: 'ORDER123',
      serviceId: 'grooming',
      deposit: 16.5,
      bookingId: 'booking-1',
    });

    expect(await verifyCaptureToken(token, 'ORDER456')).toBeNull();
  });

  it('rejects tampered tokens', async () => {
    const token = await createCaptureToken({
      orderId: 'ORDER123',
      serviceId: 'grooming',
      deposit: 16.5,
      bookingId: 'booking-1',
    });

    expect(await verifyCaptureToken(`${token}x`, 'ORDER123')).toBeNull();
    expect(await verifyCaptureToken('not-a-token', 'ORDER123')).toBeNull();
  });

  it('fails closed when no secret is configured', async () => {
    delete process.env.PAYMENT_TOKEN_SECRET;
    delete process.env.PAYPAL_CLIENT_SECRET;

    await expect(
      createCaptureToken({
        orderId: 'ORDER123',
        serviceId: 'grooming',
        deposit: 16.5,
        bookingId: 'booking-1',
      })
    ).rejects.toThrow('secret');

    process.env.PAYMENT_TOKEN_SECRET = SECRET;
  });
});
