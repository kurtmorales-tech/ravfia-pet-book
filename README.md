# RavFia Pet Services — Book with a Deposit

A booking app for a pet services business (dog walking, pet sitting, grooming,
boarding, drop-in visits) built for the **Devpost PayPal AI Hackathon**.
Base project: Kurt's `RavFia-Pet-Services` repo; PayPal plumbing adapted from
his `ravfia-pay` scaffold.

**Live demo:** https://ravfia-pet-book.anthonycabalo2.workers.dev

## The problem

Small pet services businesses lose real money to **no-shows**. A customer
books a sitter, the sitter blocks the time and turns down other work, and
then the customer just doesn't show. Phone-tag booking makes it worse:
requests come in as scattered texts, details get lost, and nothing is
confirmed until it's too late.

## How this solves it

1. **Scheduling assistant** — the customer types a plain-English request
   ("I need someone to watch my dog next Friday evening") and the app turns
   it into a pre-filled booking: service, date, and time window land in the
   form automatically.
2. **PayPal deposit** — booking isn't confirmed until a **30% deposit** is
   paid through PayPal (sandbox Orders API, create + capture). A customer
   who has paid a deposit shows up.
3. **Confirmation summary** — after capture, the app writes a plain,
   friendly confirmation with the booking details, the deposit paid, the
   booking reference, and the PayPal order ID, so both sides have the same
   record.

## How PayPal and AI map to the problem

- **PayPal (sandbox, Orders API v2)** is the commitment device: it turns a
  casual request into a paid, confirmed booking. Order creation and capture
  run server-side; the deposit amount is computed on the server from the
  service picked, never set by the browser.
- **Capture authorization** — `create-order` returns a short-lived signed
  token tied to the order ID, service, and deposit. `capture-order` refuses
  to capture without it, verifies the captured amount and currency, and only
  marks the booking confirmed when PayPal returns `COMPLETED`.
- **AI** removes the friction on the front end: the assistant parses the
  customer's free-text request into structured booking fields
  (`/api/schedule`). The assistant ships with a built-in deterministic
  parser, so the app works end to end with **no AI key**. If
  `OPENAI_API_KEY` is set, an LLM tries the parse first and the parser is
  the fallback.

## Demo data

Service prices in `lib/services.js` are **demo data** for the prototype —
they are not the prices of a real operating business, and the UI footer
says so. Payments run on the PayPal **sandbox** only: no real money moves,
and the PayPal client refuses to call anything but the sandbox API.

## Setup

1. Create a PayPal **sandbox** app at https://developer.paypal.com
   (Apps & Credentials → Sandbox) and copy its Client ID and Secret.
2. Copy the env template and fill in your sandbox values:

   ```bash
   cp .env.example .env.local
   ```

   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — server-side Orders API
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — same client ID, for the PayPal buttons
   - `PAYMENT_TOKEN_SECRET` — optional; dedicated signing key for capture
     tokens (falls back to the PayPal secret)
   - `OPENAI_API_KEY` — optional; the assistant works without it

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000. Production build: `npm run build && npm start`.
   Tests: `npm test`.

4. To pay a deposit in the demo, log in at checkout with a PayPal **sandbox
   personal account** (created in the same developer dashboard under
   Sandbox → Accounts). Without sandbox keys the app still runs — the
   checkout panel explains that the buttons are off.

## Deploying

### Cloudflare Workers (current production target)

The app is deployed with [vinext](https://github.com/cloudflare/vinext) and
the Cloudflare Vite plugin. The Worker is named `ravfia-pet-book`.

```bash
npm run build:vinext
npm run deploy:vinext
```

Local Worker preview: `npm run start:vinext`.

Set the server-side secrets on the Worker (never commit them):

```bash
npx cf workers secrets update PAYPAL_CLIENT_ID --worker ravfia-pet-book --type secret_text --text "$PAYPAL_CLIENT_ID"
npx cf workers secrets update PAYPAL_CLIENT_SECRET --worker ravfia-pet-book --type secret_text --text "$PAYPAL_CLIENT_SECRET"
npx cf workers secrets update PAYMENT_TOKEN_SECRET --worker ravfia-pet-book --type secret_text --text "$PAYMENT_TOKEN_SECRET"
```

`NEXT_PUBLIC_PAYPAL_CLIENT_ID` is baked into the client bundle at build time,
so provide it when deploying:

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id npm run deploy:vinext
```

Health check: `GET /api/health` reports whether PayPal, AI, and payment-token
configuration are present without exposing any secret values.

### Render (alternative)

`render.yaml` still describes a Render web service. Set the same environment
variables in the Render dashboard.

## Layout

- `app/page.js` — services, assistant, booking form, deposit, confirmation
- `app/api/schedule/route.js` — scheduling assistant endpoint (LLM optional)
- `app/api/paypal/` — Orders API create + capture routes
- `app/api/health/route.js` — deployment/configuration health check
- `lib/services.js` — demo service catalog, deposit math, date helpers
- `lib/assistant.js` — request parser + confirmation writer
- `lib/paypal.js` — sandbox-only PayPal client
- `lib/payment-token.js` — signed capture authorization
- `lib/request-controls.js` — rate limits, body limits, same-origin checks
- `vite.config.ts`, `cloudflare.config.ts` — Cloudflare Worker deployment
- `test/` — parser, pricing, date, and capture-token tests

## Limitations

This is a hackathon prototype, not a full booking business:

- Booking details live in the browser for the demo; there is no database or
  customer account system.
- The app does not send email or SMS. The confirmation is shown on screen
  and includes the PayPal order ID and booking reference.
- Rate limiting is in-memory per Worker isolate. Use a Cloudflare rate
  limiting rule or a Durable Object if you need a global quota.
- PayPal checkout is disabled until sandbox credentials are configured.

## License

MIT — see `LICENSE`.
