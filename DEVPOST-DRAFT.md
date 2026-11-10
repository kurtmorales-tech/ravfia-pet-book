# Devpost draft — RavFia Pet Services (replaces the old striping text)

Status: DRAFT for Kurt to paste into the Devpost submission "Ravfia" — do not
treat as submitted. Deadline: Thu Nov 12, 2026, 12:00 PM PST.
Still to fill in before submit: hosted demo URL (Render), public GitHub repo
URL, demo video URL (under 3 min, YouTube, public).

## Text description (paste into Devpost)

**RavFia Pet Services — book a pet service, pay a deposit, no more no-shows.**

Small pet services businesses lose real money to no-shows. A customer books
a sitter, the sitter blocks the time and turns down other work, then the
customer just doesn't show. Booking by scattered texts makes it worse —
details get lost and nothing is confirmed until it's too late.

This app fixes both parts:

1. **AI scheduling assistant.** The customer types a plain-English request,
   like "watch my dog Milo next Friday evening," and the app turns it into
   a pre-filled booking — service, date, and time window land in the form
   automatically. No AI key is needed: a built-in parser handles it, and if
   an OpenAI key is set, the model tries first and the parser is the fallback.
2. **PayPal deposit.** A booking isn't confirmed until a 30% deposit is paid
   through PayPal. A customer who has paid a deposit shows up. The deposit
   is calculated on the server from the service picked, never set by the
   browser.
3. **AI-written confirmation.** After PayPal confirms the payment, the app
   writes a plain, friendly confirmation with the booking details, the
   deposit paid, and the PayPal order ID, so both sides have the same record.

Services in the demo (demo prices, not a real operating business): Dog
Walking $25 per walk ($7.50 deposit), Pet Sitting $60 per day ($18.00),
Grooming $55 per session ($16.50), Boarding $45 per night ($13.50),
Drop-In Visits $20 per visit ($6.00).

## Tools used (paste into the Devpost tools field)

- PayPal Orders API v2 (sandbox) + PayPal JavaScript SDK — create-order and
  capture-order, server-side, sandbox only. No real money moves; the app
  refuses to run if PAYPAL_ENV is anything but sandbox.
- AI scheduling assistant — plain-English request parsed into booking fields
  (built-in deterministic parser; OpenAI API optional, parser is the
  fallback), plus an AI-written confirmation summary after payment.
- Next.js (app built at ravfia-pet-book, production build clean), hosted on
  Render for the demo. Public GitHub repo, MIT license.

## How a judge tries it

1. Pick a service, or type a plain-English request into the scheduling
   assistant and watch it fill the booking form.
2. Fill in pet and owner details, then pay the 30% deposit with a PayPal
   sandbox personal account at checkout.
3. See the confirmation screen: booking, payment status, and the AI-written
   summary with the PayPal order ID.

Setup is in the repo README: create a PayPal sandbox app, copy
`.env.example` to `.env.local` with the sandbox Client ID and Secret,
`npm install`, `npm run dev`.

## What this draft does NOT claim

- It does not claim the sandbox payment test has passed yet. That test is
  still blocked: PayPal temporarily locked sign-ins for
  anthonycabalo2@gmail.com on Nov 7 after too many attempts, no keys were
  pulled, nothing was changed. Wait for the lock to lift, or reset the
  password — Kurt signs in himself, at his own pace.
- It does not claim the app is deployed to Render or the repo is public yet.
  Both still wait on Kurt's go-ahead.
