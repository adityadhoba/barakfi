This is the premium Next.js frontend for the Barakfi platform.

## Local setup

1. Make sure the FastAPI backend is running on `http://127.0.0.1:8001`
2. Copy `.env.local.example` to `.env.local`
3. Add your Clerk publishable and secret keys to `.env.local`
4. Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a normal browser.

Important:
- do not rely on IDE proxy preview tabs if they show `Failed to proxy ... socket hang up`
- use Chrome/Safari directly with `http://localhost:3000`
- keep the backend on `http://127.0.0.1:8001`

The homepage reads from the FastAPI API for:
- dashboard summary
- stock universe
- portfolio
- watchlist
- rulebook
- screening logs
- auth strategy

If the backend is unavailable, the frontend falls back gracefully for a few key sections so the shell can still render.

Clerk routes added:
- `/account`
- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/workspace` protected by Clerk middleware

Backend bridge:
- the Next.js server loads `/api/me/workspace` using the signed-in Clerk session token
- first-time users complete `/onboarding`, which bootstraps their backend profile through an authenticated route

## Why this stack

- `Next.js`: premium product UI, routing, and future auth flows
- `FastAPI`: compliance engine, screening logic, portfolio APIs
- `Clerk`: planned auth provider for Google sign-in
- `Managed payments later`: do not build card handling in-house early

## Production direction

- keep the moat in compliance, explainability, and trust
- outsource auth and payments to proven providers
- move the current founder dashboard into a full signed-in app over time
- connect this frontend to real Clerk sessions once your keys are ready

## Verify

```bash
npm run lint
npm run build
```

Both commands are currently passing.
