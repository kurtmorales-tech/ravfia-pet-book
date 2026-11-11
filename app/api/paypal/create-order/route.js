import { NextResponse } from 'next/server';
import { createCaptureToken, createPaypalOrder, isSameOriginRequest } from '../../../../lib/paypal';
import { getService, depositFor } from '../../../../lib/services';

// The deposit is computed on the server from the demo catalog (30% of the
// service price) — the browser never sets the amount.
export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request must come from this site.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

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
    return NextResponse.json({
      id: order.id,
      deposit,
      servicePrice: service.price,
      captureToken: createCaptureToken(order.id),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
