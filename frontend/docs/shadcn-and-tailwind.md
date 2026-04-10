# shadcn/ui + Tailwind in this repo

## Current setup (after visx integration)

- **TypeScript**: already enabled (`tsconfig.json`, `paths`: `@/*` → `./src/*`).
- **Tailwind CSS v4**: `@import "tailwindcss"` in `src/app/globals.css`, `postcss.config.mjs` with `@tailwindcss/postcss`.
- **`cn()` helper**: `src/lib/utils.ts` (`clsx` + `tailwind-merge`) — same as shadcn docs.
- **Components**: `src/components/ui/` holds primitives and drop-ins (e.g. `finance-chart.tsx`).

## Why `src/components/ui/` matters

shadcn CLI defaults to **`components/ui`**. Keeping that path:

- Matches official docs and copy-paste snippets (`@/components/ui/...`).
- Avoids mixing one-off charts with domain components in `src/components/`.

## Full shadcn CLI (optional)

If you want the interactive CLI and pre-built primitives (Button, Card, …):

```bash
cd frontend
npx shadcn@latest init
```

Choose **Tailwind v4**, **New York** (or default), and confirm **`@/components/ui`** for components. Then add pieces with:

```bash
npx shadcn@latest add button
```

## visx + React 19

`@visx/*` peer-deps list React 18; install with:

```bash
npm install @visx/... --legacy-peer-deps
```
