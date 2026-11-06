# TIVA Foundation Referral Challenge

This repository contains the TIVA Foundation referral challenge application. It includes a Next.js web app, Supabase-backed authentication/data access, participant and admin areas, referral challenge flows, and a Razorpay webhook integration. It is **not** the Foundation's general public information website or a replacement for Zoho finance systems.

## Before you begin

- Use synthetic/test data for local development.
- Do not put API keys, Supabase service-role keys, payment secrets, or production credentials in source files, commits, screenshots, logs, or chat.
- Keep TIVA World Foundation separate from TIVA Beverages and Holdings. Verify the entity and environment before any data operation.
- Payment, payout, donor, KYC, identity, and production changes require the authorized human review for that workflow.
- Do not use a production payment key for local testing.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Configure only non-production development credentials in your local environment as required by the app. Never commit `.env*` files containing secrets.

## Project checks

```bash
npm run lint
npm run build
```

Run both checks before proposing a release. Pull requests run the repository's GitHub Actions workflows; review their status and output before merge.

## Main areas

- `src/app`: Next.js routes, layouts, actions, and API handlers.
- `src/components/landing`: public landing page.
- `src/components/dashboard`: participant experience.
- `src/components/admin`: administrative views.
- `src/lib/supabase`: Supabase clients.
- `src/app/api/webhooks/razorpay`: payment-provider webhook handler.
- `supabase`: database migrations and policies.

## Deployment

The repository homepage currently points to `https://tiva-foundation.vercel.app`. Treat this as an existing deployed application, not proof that the current branch is production-ready. Use a reviewed pull request and a preview deployment first. Verify authentication, participant flows, webhook behavior in test mode, environment bindings, and the rollback target. Production deployment requires explicit go-live approval.

## Related operations status

See [OPERATIONS-DELIVERY-2026-10-17.md](./OPERATIONS-DELIVERY-2026-10-17.md) for the dated infrastructure audit and its remaining gates. Historical checks in that report are not substitutes for checks on the current commit.
