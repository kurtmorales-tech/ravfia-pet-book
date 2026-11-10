# RavFia Pet Services — Book with a Deposit

A booking app for a pet services business (dog walking, pet sitting, grooming,
boarding, drop-in visits) built for the **Devpost PayPal AI Hackathon**.
Base project: Kurt's `RavFia-Pet-Services` repo; PayPal plumbing adapted from
his `ravfia-pay` scaffold.

## The problem

Small pet services businesses lose real money to **no-shows**. A customer
books a sitter, the sitter blocks the time and turns down other work, and
then the customer just doesn't show. Phone-tag booking makes it worse:
requests come in as scattered texts, details get lost, and nothing is
confirmed until it's too late.

## How this solves it

1. **AI scheduling assistant** — the customer types a plain-English request
   ("I need someone to watch my dog next Friday evening") and the app turns
   it into a pre-filled booking: service, date, and time window land in the
   form automatically.
2. **PayPal deposit** — booking isn't confirmed until a **30% deposit** is
   paid through PayPal (sandbox Orders API, create + capture). A customer
   who has paid a deposit shows up.
3. **AI-written confirmation** — after capture, the app writes a plain,
   friendly confirmation summary with the booking details, the deposit paid,
   and the PayPal order ID, so both sides have the same record.

## How PayPal and AI map to the problem

- **PayPal (sandbox, Orders API v2)** is the commitment device: it turns a
  casual request into a paid, confirmed booking. Order creation and capture
  run server-side; the deposit amount is computed on the server from the
  service picked, never set by the browser.
- **AI** removes the friction on both ends of the booking: it parses the
  customer's free-text request into structured booking fields
  (`/api/schedule`), and it writes the confirmation summary the customer
  reads after paying. The assistant ships with a built-in deterministic
  parser, so the app works end to end with **no AI key**. If
  `OPENAI_API_KEY` is set, an LLM tries the parse first and the parser is
  the fallback.

## Demo data

Service prices in `lib/services.js` are **demo data** for the prototype —
they are not the prices of a real operating business, and the UI footer
says so. Payments run on the PayPal **sandbox** only: no real money moves,
and the app refuses to run if `PAYPAL_ENV` is set to anything but `sandbox`.

## Setup

1. Create a PayPal **sandbox** app at https://developer.paypal.com
   (Apps & Credentials → Sandbox) and copy its Client ID and Secret.
2. Copy the env template and fill in your sandbox values:

   ```bash
   cp .env.example .env.local
   ```

   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — server-side Orders API
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — same client ID, for the PayPal buttons
   - `OPENAI_API_KEY` — optional; the assistant works without it

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000. Production build: `npm run build && npm start`.

4. To pay a deposit in the demo, log in at checkout with a PayPal **sandbox
   personal account** (created in the same developer dashboard under
   Sandbox → Accounts). Without sandbox keys the app still runs — the
   checkout panel explains that the buttons are off.

## Layout

- `app/page.js` — services, assistant, booking form, deposit, confirmation
- `app/api/schedule/route.js` — scheduling assistant endpoint (LLM optional)
- `app/api/paypal/` — Orders API create + capture routes
- `lib/services.js` — demo service catalog and deposit math
- `lib/assistant.js` — request parser + confirmation writer
- `lib/paypal.js` — sandbox-only PayPal client

## License

MIT — see `LICENSE`.
