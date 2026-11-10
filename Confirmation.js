'use client';

import { getService, getTimeWindow, money } from '../lib/services';
import { formatDate, writeConfirmationSummary } from '../lib/assistant';

export default function Confirmation({ booking, payment, onStartOver }) {
  const service = getService(booking.serviceId);
  const window = getTimeWindow(booking.timeWindow);
  const summary = writeConfirmationSummary(booking, payment);

  return (
    <div>
      <h2>Booking confirmed</h2>
      <table>
        <tbody>
          <tr>
            <th>Service</th>
            <td>{service ? `${service.name} — ${money(service.price)} ${service.unit}` : '—'}</td>
          </tr>
          <tr>
            <th>When</th>
            <td>
              {formatDate(booking.date)}
              {window ? `, ${window.label}` : ''}
            </td>
          </tr>
          <tr>
            <th>Pet</th>
            <td>{[booking.petName, booking.petType].filter(Boolean).join(' — ') || '—'}</td>
          </tr>
          <tr>
            <th>Customer</th>
            <td>
              {booking.customerName}
              {booking.email ? ` (${booking.email})` : ''}
            </td>
          </tr>
          <tr>
            <th>Deposit paid</th>
            <td>
              {payment ? `${money(payment.amountPaid)} via PayPal — status ${payment.status}` : '—'}
            </td>
          </tr>
          {payment?.id && (
            <tr>
              <th>PayPal order</th>
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

      <button className="ghost" onClick={onStartOver}>
        Book another appointment
      </button>
    </div>
  );
}
