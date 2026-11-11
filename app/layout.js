import './globals.css';

export const metadata = {
  title: 'RavFia Pet Services — Book with a Deposit',
  description:
    'Book dog walking, pet sitting, grooming, boarding, and drop-in visits. An AI scheduling assistant fills in the booking, and a PayPal deposit locks it in — no more no-shows.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
