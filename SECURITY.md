# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | Yes       |
| 1.0.x   | No        |
| < 1.0   | No        |

## Reporting a vulnerability

Do not open a public issue for a security problem.

Email the details to **mail@ravfiastrategic0perations.com**. Include what you
found, the steps to reproduce it, and what it could let someone do. We read
every report and reply as soon as we can.

## Notes on this build

RavFia Pet Services is a prototype built for the Devpost PayPal AI Hackathon.
Payments run on the PayPal sandbox only — no real money moves, and the PayPal
client refuses any non-sandbox `PAYPAL_ENV`. Service prices in the app are
demo data. Never put real PayPal credentials, API keys, or personal data in a
public issue.

The API routes use request-size limits, per-isolate rate limits, and signed
capture tokens. The token binds a PayPal order to the service and deposit
created by this app; capture also checks the captured amount and currency
before showing a confirmed booking.
