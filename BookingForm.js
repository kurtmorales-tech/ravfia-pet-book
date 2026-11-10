'use client';

import { TIME_WINDOWS } from '../lib/services';

const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

export default function BookingForm({ booking, onChange }) {
  const set = (key) => (e) => onChange({ ...booking, [key]: e.target.value });

  return (
    <div className="grid">
      <div>
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={booking.date || ''} onChange={set('date')} required />
      </div>
      <div>
        <label htmlFor="timeWindow">Time window</label>
        <select id="timeWindow" value={booking.timeWindow || ''} onChange={set('timeWindow')} required>
          <option value="">Pick a time window…</option>
          {TIME_WINDOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="petName">Pet&apos;s name</label>
        <input id="petName" value={booking.petName || ''} onChange={set('petName')} placeholder="Milo" />
      </div>
      <div>
        <label htmlFor="petType">Pet type</label>
        <select id="petType" value={booking.petType || ''} onChange={set('petType')}>
          <option value="">Pick a type…</option>
          {PET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="customerName">Your name</label>
        <input id="customerName" value={booking.customerName || ''} onChange={set('customerName')} placeholder="Jordan Lee" required />
      </div>
      <div>
        <label htmlFor="email">Your email</label>
        <input id="email" type="email" value={booking.email || ''} onChange={set('email')} placeholder="you@example.com" required />
      </div>
      <div className="span-2">
        <label htmlFor="notes">Notes for the sitter (optional)</label>
        <textarea
          id="notes"
          rows={3}
          value={booking.notes || ''}
          onChange={set('notes')}
          placeholder="Feeding instructions, door code, anything we should know…"
        />
      </div>
    </div>
  );
}
