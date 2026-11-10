// Scheduling assistant: turns a plain-English request into booking fields,
// and writes the booking confirmation summary.
//
// The parser here is deterministic (keyword + date rules) so the app works
// end to end with NO AI key. The /api/schedule route will try an LLM first
// when OPENAI_API_KEY is set, and fall back to this parser on any failure.

import { getService, getTimeWindow, money } from './services';

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseServiceId(t) {
  if (/\b(board|boarding|kennel|stay over|overnight stay)\b/.test(t)) return 'boarding';
  if (/\b(groom|grooming|bath|haircut|nail trim)\b/.test(t)) return 'grooming';
  if (/\b(walk|walking|walker)\b/.test(t)) return 'dog-walking';
  if (/\b(drop[- ]?in|visit|feeding|feed my|check on)\b/.test(t)) return 'drop-in';
  if (/\b(sit|sitting|sitter|watch|watching|look after|stay with)\b/.test(t)) return 'pet-sitting';
  return null;
}

function parseDate(t, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (/\btoday\b/.test(t)) return toISODate(today);
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }

  const inDays = t.match(/\bin (\d{1,2}) days?\b/);
  if (inDays) {
    const d = new Date(today);
    d.setDate(d.getDate() + Number(inDays[1]));
    return toISODate(d);
  }

  // "next friday", "on friday", "friday evening"
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    const re = new RegExp(`\\b(next\\s+)?${name}\\b`);
    const m = t.match(re);
    if (m) {
      let delta = (dow - today.getDay() + 7) % 7;
      if (delta === 0) delta = m[1] ? 7 : 0;
      const d = new Date(today);
      d.setDate(d.getDate() + delta);
      return toISODate(d);
    }
  }

  // "nov 14", "november 14", "14 nov"
  const monthNames = Object.keys(MONTHS).join('|');
  let m = t.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\b`));
  if (m) {
    return makeDate(today, MONTHS[m[1]], Number(m[2]));
  }
  m = t.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\b`));
  if (m) {
    return makeDate(today, MONTHS[m[2]], Number(m[1]));
  }

  // "11/14"
  m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m) {
    return makeDate(today, Number(m[1]) - 1, Number(m[2]));
  }

  return '';
}

function makeDate(today, month, day) {
  let d = new Date(today.getFullYear(), month, day);
  if (d < today) d = new Date(today.getFullYear() + 1, month, day);
  return toISODate(d);
}

function parseTimeWindow(t) {
  if (/\bmorning\b/.test(t)) return 'morning';
  if (/\bmidday\b|\bnoon\b|\blunch ?time\b/.test(t)) return 'midday';
  if (/\bafternoon\b/.test(t)) return 'afternoon';
  if (/\bevening\b|\bnight\b|\btonight\b/.test(t)) return 'evening';

  const time = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (time) {
    let hour = Number(time[1]) % 12;
    if (time[3] === 'pm') hour += 12;
    if (hour < 11) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  return '';
}

function parsePet(text) {
  const lower = text.toLowerCase();
  let petType = '';
  if (/\b(puppy|dog)\b/.test(lower)) petType = 'Dog';
  else if (/\b(kitten|cat)\b/.test(lower)) petType = 'Cat';
  else if (/\bbird\b/.test(lower)) petType = 'Bird';
  else if (/\brabbit|bunny\b/.test(lower)) petType = 'Rabbit';

  let petName = '';
  const named = text.match(/\b(?:named|called)\s+([A-Z][a-zA-Z]+)/);
  const myPet = text.match(/\b(?:my|our)\s+(?:dog|cat|puppy|kitten|bird|rabbit|bunny)\s+([A-Z][a-zA-Z]+)/);
  // "grooming for Bella" — accept a capitalized word after "for" only when it
  // is not a weekday, month, or time word.
  const NOT_A_NAME =
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|morning|midday|afternoon|evening|night|january|february|march|april|may|june|july|august|september|october|november|december|next|the|a|an)$/i;
  const forPet = text.match(/\bfor\s+([A-Z][a-zA-Z]+)\b/);
  if (named) petName = named[1];
  else if (myPet) petName = myPet[1];
  else if (forPet && !NOT_A_NAME.test(forPet[1])) petName = forPet[1];

  return { petName, petType };
}

// Parse a free-text request into booking fields.
// Returns { fields, understood, missing } — fields only includes keys found.
export function parseBookingRequest(text, now = new Date()) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const fields = {};

  const serviceId = parseServiceId(t);
  if (serviceId) fields.serviceId = serviceId;

  const date = parseDate(t, now);
  if (date) fields.date = date;

  const timeWindow = parseTimeWindow(t);
  if (timeWindow) fields.timeWindow = timeWindow;

  const { petName, petType } = parsePet(String(text || ''));
  if (petName) fields.petName = petName;
  if (petType) fields.petType = petType;

  const understood = [];
  if (serviceId) understood.push(`service: ${getService(serviceId)?.name}`);
  if (date) understood.push(`date: ${formatDate(date)}`);
  if (timeWindow) understood.push(`time: ${getTimeWindow(timeWindow)?.label}`);
  if (petName || petType) {
    understood.push(`pet: ${[petName, petType].filter(Boolean).join(' ')}`);
  }

  const missing = [];
  if (!serviceId) missing.push('which service you need');
  if (!date) missing.push('the date');
  if (!timeWindow) missing.push('a time of day (morning, midday, afternoon, or evening)');

  return { fields, understood, missing };
}

export function assistantReply(parsed) {
  if (parsed.understood.length === 0) {
    return (
      "I didn't quite catch that. Try something like: “I need someone to watch my dog Max " +
      'next Friday evening” or “Book a grooming for Bella on Nov 14 in the morning.”'
    );
  }
  let reply = `Got it — I filled in ${parsed.understood.join(', ')} on the booking form below.`;
  if (parsed.missing.length > 0) {
    reply += ` Still needed: ${parsed.missing.join(' and ')}. You can type it here or pick it in the form.`;
  } else {
    reply += ' Add your name and email in the form, then pay the deposit to lock it in.';
  }
  return reply;
}

// AI-written confirmation summary for a completed booking.
export function writeConfirmationSummary(booking, payment) {
  const service = getService(booking.serviceId);
  const window = getTimeWindow(booking.timeWindow);
  const petLabel = booking.petName
    ? `${booking.petName}${booking.petType ? ` (your ${booking.petType.toLowerCase()})` : ''}`
    : 'your pet';

  const lines = [
    `Thanks, ${booking.customerName || 'friend'} — you're booked!`,
    `${petLabel} is set for ${service ? service.name : 'pet care'} on ${formatDate(booking.date)}` +
      `${window ? `, ${window.label.toLowerCase()}` : ''}.`,
  ];
  if (booking.notes) {
    lines.push(`We noted: “${booking.notes}”`);
  }
  if (payment) {
    lines.push(
      `Your deposit of ${money(payment.amountPaid || 0)} was paid through PayPal ` +
        `(order ${payment.id}, status: ${payment.status}). The rest is due at the appointment.`
    );
    lines.push(
      'A sitter will confirm the exact arrival time by email before the appointment. ' +
        'Need to reschedule? Reply to your confirmation email at least 24 hours ahead and the deposit moves with you.'
    );
  }
  return lines.join('\n\n');
}
