import { NextResponse } from 'next/server';
import { createPaypalOrder } from '../../../../lib/paypal';
import { getService, depositFor } from '../../../../lib/services';
import { isRateLimited, readJsonBody } from '../../../../lib/request-controls';

// The deposit is computed on the server from the demo catalog (30% of the
// service price) — the browser never sets the amount.
export async function POST(request) {
  if (isRateLimited(request, 'paypal-create-order', 5)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

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

  const deposit = depositFor(service);
  const description =
    `RavFia Pet Services — ${service.name} booking deposit ` +
    `(${body?.date || 'date TBD'}${body?.petName ? `, pet: ${body.petName}` : ''})`;

  try {
    const order = await createPaypalOrder(deposit, description);
    return NextResponse.json({ id: order.id, deposit, servicePrice: service.price });
  } catch {
    return NextResponse.json({ error: 'Payment provider is temporarily unavailable.' }, { status: 500 });
  }
}
