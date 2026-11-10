// Demo service catalog. Prices are DEMO DATA for the hackathon prototype —
// they are not the prices of a real operating business.

export const SERVICES = [
  {
    id: 'dog-walking',
    name: 'Dog Walking',
    price: 25,
    unit: 'per walk',
    blurb: 'A 45-minute neighborhood walk with water top-off and a photo update.',
  },
  {
    id: 'pet-sitting',
    name: 'Pet Sitting',
    price: 60,
    unit: 'per day',
    blurb: 'A sitter stays with your pet at your home — feeding, play, and company.',
  },
  {
    id: 'grooming',
    name: 'Grooming',
    price: 55,
    unit: 'per session',
    blurb: 'Bath, brush, nail trim, and ear cleaning for dogs and cats.',
  },
  {
    id: 'boarding',
    name: 'Boarding',
    price: 45,
    unit: 'per night',
    blurb: 'Your pet stays overnight in a home setting, with evening and morning care.',
  },
  {
    id: 'drop-in',
    name: 'Drop-In Visits',
    price: 20,
    unit: 'per visit',
    blurb: 'A quick visit to feed, refresh water, clean the litter box, and check in.',
  },
];

export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning (7–11 AM)' },
  { id: 'midday', label: 'Midday (11 AM–2 PM)' },
  { id: 'afternoon', label: 'Afternoon (2–5 PM)' },
  { id: 'evening', label: 'Evening (5–9 PM)' },
];

export const DEPOSIT_RATE = 0.3;

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

export function getTimeWindow(id) {
  return TIME_WINDOWS.find((w) => w.id === id) || null;
}

export function depositFor(service) {
  if (!service) return 0;
  return Math.round(service.price * DEPOSIT_RATE * 100) / 100;
}

export function money(n) {
  return `$${Number(n).toFixed(2)}`;
}
