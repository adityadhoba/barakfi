# Security and Compliance Baseline

This project should treat security and compliance as product features, not later add-ons.

## Current baseline

The backend now includes:
- environment-aware config
- CORS allowlist support
- security response headers
- health endpoint for safe monitoring
- rule-version tracking
- screening audit logs

## Recommended low-cost auth strategy

Do not build your own password system first.

Start with:
- Clerk

Why:
- lower engineering risk
- better MFA support
- faster production readiness
- stronger consumer-product authentication UX for this app's direction

## Recommended low-cost payments strategy

Do not store card data yourself.

India-first path:
- Razorpay for subscriptions/payments in India

Global path later:
- Stripe where supported for international users

Keep payments isolated from compliance logic.

## Compliance operating principles

- Every screening result should reference a rule profile and version.
- Every rule change should be documented before release.
- Ambiguous rules should produce review states, not false certainty.
- Manual overrides should be logged with actor, timestamp, and reason.

## Before production launch

- move to Postgres
- add real authentication
- add rate limiting
- add secrets management
- add structured application logging
- add encrypted backups
- add legal review for investment and execution flows
