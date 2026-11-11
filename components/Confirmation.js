'use client';

import { useEffect, useRef } from 'react';
import { getService, getTimeWindow, money } from '../lib/services';
import { formatDate, writeConfirmationSummary } from '../lib/assistant';

export default function Confirmation({ booking, payment, onStartOver }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const service = getService(payment?.serviceId || booking.serviceId);
  const window = getTimeWindow(booking.timeWindow);
  const confirmed = payment?.status === 'COMPLETED';
  const summary = writeConfirmationSummary(
    { ...booking, serviceId: service?.id || booking.serviceId },
    payment
  );

  return (
    <div>
      <h2 tabIndex={-1} ref={headingRef}>
        {confirmed ? 'Booking confirmed' : 'Payment pending'}
      </h2>

      {!confirmed && (
        <div className="notice" role="status">
          PayPal returned status <strong>{payment?.status || 'unknown'}</strong>. Your booking is
          not confirmed until the payment completes. Keep the order ID below for reference.
        </div>
      )}

      <table>
        <tbody>
          <tr>
            <th scope="row">Service</th>
            <td>{service ? `${service.name} — ${money(service.price)} ${service.unit}` : '—'}</td>
          </tr>
          <tr>
            <th scope="row">When</th>
            <td>
              {formatDate(booking.date)}
              {window ? `, ${window.label}` : ''}
            </td>
          </tr>
          <tr>
            <th scope="row">Pet</th>
            <td>{[booking.petName, booking.petType].filter(Boolean).join(' — ') || '—'}</td>
          </tr>
          <tr>
            <th scope="row">Customer</th>
            <td>
              {booking.customerName}
              {booking.email ? ` (${booking.email})` : ''}
            </td>
          </tr>
          <tr>
            <th scope="row">Deposit</th>
            <td>
              {payment
                ? `${money(payment.amountPaid ?? payment.deposit)} via PayPal — status ${payment.status}`
                : '—'}
            </td>
          </tr>
          {payment?.bookingId && (
            <tr>
              <th scope="row">Booking reference</th>
              <td>{payment.bookingId}</td>
            </tr>
          )}
          {payment?.id && (
            <tr>
              <th scope="row">PayPal order</th>
              <td>{payment.id}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="summary-box">
        {summary.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <button className="ghost" type="button" onClick={onStartOver}>
        Book another appointment
      </button>
    </div>
  );
}
