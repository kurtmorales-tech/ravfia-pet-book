'use client';

import { PET_TYPES, TIME_WINDOWS } from '../lib/services';

function RequiredMark() {
  return (
    <span className="req" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export default function BookingForm({ booking, onChange, minDate }) {
  const set = (key) => (e) => onChange({ ...booking, [key]: e.target.value });

  return (
    <div className="grid">
      <div>
        <label htmlFor="date">
          Date
          <RequiredMark />
        </label>
        <input
          id="date"
          name="date"
          type="date"
          min={minDate}
          value={booking.date || ''}
          onChange={set('date')}
          required
        />
      </div>
      <div>
        <label htmlFor="timeWindow">
          Time window
          <RequiredMark />
        </label>
        <select
          id="timeWindow"
          name="timeWindow"
          value={booking.timeWindow || ''}
          onChange={set('timeWindow')}
          required
        >
          <option value="">Pick a time window…</option>
          {TIME_WINDOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="petName">Pet&apos;s name (optional)</label>
        <input
          id="petName"
          name="petName"
          value={booking.petName || ''}
          onChange={set('petName')}
          placeholder="Milo"
          maxLength={60}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="petType">Pet type (optional)</label>
        <select id="petType" name="petType" value={booking.petType || ''} onChange={set('petType')}>
          <option value="">Pick a type…</option>
          {PET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="customerName">
          Your name
          <RequiredMark />
        </label>
        <input
          id="customerName"
          name="customerName"
          value={booking.customerName || ''}
          onChange={set('customerName')}
          placeholder="Jordan Lee"
          maxLength={100}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <label htmlFor="email">
          Your email
          <RequiredMark />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          value={booking.email || ''}
          onChange={set('email')}
          placeholder="you@example.com"
          maxLength={254}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      <div className="span-2">
        <label htmlFor="notes">Notes for the sitter (optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={booking.notes || ''}
          onChange={set('notes')}
          placeholder="Feeding instructions, door code, anything we should know…"
          maxLength={1000}
        />
      </div>
    </div>
  );
}
