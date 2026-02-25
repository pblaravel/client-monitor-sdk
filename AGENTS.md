# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is `@monitor-txs/client-monitor-sdk` — a TypeScript SDK for the ChainPing Monitor TXS REST API (`https://api.chain-monitor.online`). It is a monorepo fragment (library only, no backend/server). Zero runtime dependencies; only `typescript` as a devDependency.

### Monorepo context

The `tsconfig.json` extends `../../tsconfig.base.json` which does not exist in this repo (it's from the parent monorepo). A base tsconfig must be created at `/tsconfig.base.json` with at minimum:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  }
}
```

The `"DOM"` lib is required because the SDK uses `fetch`, `AbortController`, `URL`, `URLSearchParams`, `Headers`, `FormData` — all Web/DOM APIs available natively in Node 18+.

This file is outside the repo (`/tsconfig.base.json`), so the update script recreates it on every run.

### Build / Lint / Test

- **Build:** `npm run build` (runs `tsc -p tsconfig.json`, output in `dist/`)
- **Lint:** `npm run lint` (currently a no-op placeholder)
- **Tests:** No test framework configured. No automated tests exist.
- **Clean:** `npm run clean` (removes `dist/`)

### Quick validation

The public endpoint works without authentication:

```js
import { MonitorTxsClient } from './dist/index.js';
const client = new MonitorTxsClient();
const networks = await client.public.getNetworks();
```

Authenticated endpoints (profile, wallets, notifications, balance) require a valid JWT token.
