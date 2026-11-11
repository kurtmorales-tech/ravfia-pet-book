import { NextResponse } from 'next/server';
import { createPaypalOrder, paypalStatus } from '../../../../lib/paypal';
import {
  getService,
  depositFor,
  TIME_WINDOWS,
  isValidISODate,
  isPastDate,
  todayISO,
} from '../../../../lib/services';
import { createCaptureToken } from '../../../../lib/payment-token';
import {
  isSameOriginRequest,
  rateLimit,
  readJsonBody,
  tooManyRequestsResponse,
} from '../../../../lib/request-controls';

// The deposit is computed on the server from the demo catalog (30% of the
// service price) — the browser never sets the amount. The signed capture token
// ties the PayPal order to that service and amount.
export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request must come from this site.' }, { status: 403 });
  }

  const limited = rateLimit(request, 'paypal-create-order', 5);
  if (limited.limited) return tooManyRequestsResponse(NextResponse, limited.retryAfter);

  const result = await readJsonBody(request, 2048);
  if (result.error === 'too_large') {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }
  if (result.error) {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const body = result.body;
  const service = getService(body?.serviceId);
  if (!service) {
    return NextResponse.json({ error: 'Pick a service first.' }, { status: 400 });
  }

  const date = String(body?.date || '');
  if (!isValidISODate(date)) {
    return NextResponse.json({ error: 'Pick a valid date.' }, { status: 400 });
  }
  const clientToday = isValidISODate(body?.today) ? body.today : todayISO();
  if (isPastDate(date, new Date(`${clientToday}T12:00:00`))) {
    return NextResponse.json({ error: 'Pick a date in the future.' }, { status: 400 });
  }

  const timeWindow = String(body?.timeWindow || '');
  if (!TIME_WINDOWS.some((window) => window.id === timeWindow)) {
    return NextResponse.json({ error: 'Pick a valid time window.' }, { status: 400 });
  }

  const paypal = paypalStatus();
  if (!paypal.sandbox) {
    return NextResponse.json(
      { error: 'This app only supports the PayPal sandbox.' },
      { status: 503 }
    );
  }
  if (!paypal.configured) {
    return NextResponse.json(
      { error: 'PayPal sandbox checkout is not configured on this deployment.' },
      { status: 503 }
    );
  }

  const deposit = depositFor(service);
  const description = `RavFia Pet Services — ${service.name} deposit (${date})`;

  try {
    const order = await createPaypalOrder(deposit, description);
    const bookingId = crypto.randomUUID();
    const captureToken = await createCaptureToken({
      orderId: order.id,
      serviceId: service.id,
      deposit,
      bookingId,
    });

    return NextResponse.json({
      id: order.id,
      bookingId,
      deposit,
      servicePrice: service.price,
      captureToken,
    });
  } catch (error) {
    console.error('PayPal create order failed:', error.message);
    return NextResponse.json(
      { error: 'Could not start PayPal checkout. Please try again.' },
      { status: 502 }
    );
  }
}
