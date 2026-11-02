# @monitor-txs/client-monitor-sdk

TypeScript/JavaScript client for **[Chain Monitor](https://chain-monitor.online)** — a credit-based blockchain monitoring service. Watch public wallets and smart contracts on Ethereum, BSC, Polygon, TRON, Solana, Sui, opBNB and other live networks. Matching transfers are delivered as **HMAC-signed webhooks** or **Telegram** alerts after they appear on-chain.

This package talks to `https://api.chain-monitor.online`. The product API lives in the [REST reference](https://chain-monitor.online/docs/api).

[Create an account](https://chain-monitor.online) · [Docs](https://chain-monitor.online/docs) · [API](https://chain-monitor.online/docs/api) · [USDT monitoring](https://chain-monitor.online/usdt-monitoring) · [TRC-20 monitoring](https://chain-monitor.online/trc20-monitoring)

## What you get

- Wallet monitors: address + network + tokens + optional `minAmount`
- HMAC-SHA256 webhook verification (`X-Webhook-Signature`)
- Both event types: `transaction_confirmed` and optional `transaction_detected`
- Telegram and/or webhook delivery via `notifySettings`
- Public network/token catalog (`GET /public/networks`) so you never hard-code UUIDs
- Payment-page helpers (`POST /v1/payment-pages/…`)
- Node.js 18+

New accounts receive **1000 free credits**. **1 credit = 1 delivered alert**. Quiet wallets do not spend credits. Enabling both event types costs **2 credits** per transfer.

## Install

```bash
npm install @monitor-txs/client-monitor-sdk
```

## Quickstart

```ts
import { MonitorTxsClient, requireNetwork, requireToken } from '@monitor-txs/client-monitor-sdk';

const client = new MonitorTxsClient({ apiKey: process.env.CHAIN_MONITOR_API_KEY });

const networks = await client.public.getNetworks();
const tron = requireNetwork(networks, 'tron');
const usdt = requireToken(tron, { slug: 'usdt' });

await client.wallets.create({
  address: 'TYourTronAddress',
  networkUuid: tron.id,
  tokenUuids: [usdt.id],
  webhookUrl: 'https://your-app.example/webhook',
  notifySettings: { webhook: true, onConfirmed: true, onDetected: false },
});
```

Create the API key in **Dashboard → API** (`Authorization: Bearer api_key_…`). The pairing webhook secret (`whsec_…`) is shown once — store it for signature verification.

```ts
import { parseWebhookPayload, verifyWebhookSignature } from '@monitor-txs/client-monitor-sdk';

const ok = verifyWebhookSignature({
  rawBody, // exact bytes, not JSON.stringify(parsed)
  signatureHeader: req.headers['x-webhook-signature'],
  secret: process.env.CHAIN_MONITOR_WEBHOOK_SECRET,
});
if (!ok) throw new Error('invalid signature');

const event = parseWebhookPayload(rawBody);
// event.eventType === 'transaction_confirmed' | 'transaction_detected'
```

## Event types

| `eventType` | When it is sent | Wallet flag |
|-------------|-----------------|-------------|
| `transaction_confirmed` | After the network confirmation depth | `notifySettings.onConfirmed` (default `true`) |
| `transaction_detected` | When the transfer is first seen in a block | `notifySettings.onDetected` (default `false`) |

At least one flag must be true. Credit deposits on **`transaction_confirmed`**. Details: [detected vs confirmed](docs/guides/detected-vs-confirmed.md).

## Supported networks

Live list comes from `GET /public/networks` (each item has `id`, `name`, `slug`, `type`, `tokens`). Documented networks include:

Ethereum (`eth`), BNB Smart Chain (`bsc`), opBNB, Polygon, Avalanche, TRON, Solana, Sui, Base, Arbitrum, Optimism, Linea, Fantom, Decimal, Gnosis, Unichain, Robinhood, PulseChain, Cronos.

The public catalog may include additional live networks. Ethereum’s slug is `eth`; `requireNetwork(networks, 'ethereum')` maps to it.

Use cases: [USDT on ETH / TRON / BSC](https://chain-monitor.online/usdt-monitoring), [TRC-20](https://chain-monitor.online/trc20-monitoring), [wallet monitoring](https://chain-monitor.online/wallet-monitoring), [smart contract monitoring](https://chain-monitor.online/smart-contract-monitoring).

## Configuration

```ts
const client = new MonitorTxsClient({
  baseUrl: 'https://api.chain-monitor.online',
  apiKey: 'api_key_…',
  timeoutMs: 15000,
  retry: { retries: 2, delayMs: 300 },
  // 'auto' (default): /v1 for api_key_… tokens, unversioned routes for dashboard JWT
  apiPrefix: 'auto',
});
```

| Option | Notes |
|--------|--------|
| `apiKey` | Preferred. Dashboard → API. |
| `authToken` | Same header (`Bearer …`). Kept for JWT / older integrations. |
| `apiPrefix` | `'auto'`, `'/v1'`, or `''`. |

Disable auth on a single call: `client.request('GET', '/public/networks', { auth: false })`.

## Client methods

### Public (no auth)

| Method | Endpoint |
|--------|----------|
| `client.public.getNetworks()` | `GET /public/networks` |
| `client.public.getPackCredits()` | `GET /public/pack-credits` |

### Wallets (API key → `/v1/wallets`)

| Method | Endpoint |
|--------|----------|
| `client.wallets.list()` | `GET /v1/wallets` |
| `client.wallets.create(body)` | `POST /v1/wallets` |
| `client.wallets.update(id, body)` | `PATCH /v1/wallets/:id` |
| `client.wallets.remove(id)` | `DELETE /v1/wallets/:id` |
| `client.wallets.toggle(id)` | `POST /v1/wallets/:id/toggle` |

`CreateWalletDTO`: `{ address, networkUuid, tokenUuids, minAmount?, webhookUrl?, notifySettings? }`.

`notifySettings`: `telegram`, `webhook`, `notifyIncoming`, `notifyOutgoing`, `onDetected`, `onConfirmed`.

### Notifications

| Method | Endpoint |
|--------|----------|
| `client.notifications.list(query?)` | `GET /v1/notifications` → `{ notifications, total }` |
| `client.notifications.get(id)` | `GET /v1/notifications/:id` |
| `client.notifications.getTxRaw(id)` | `GET /v1/notifications/:id/tx-raw` |

Query: `{ limit?, offset?, status?, channel?, networkSlug? }` (`limit` 1–100, default 25).

### Payment pages

| Method | Endpoint |
|--------|----------|
| `client.paymentPages.addPoolWallet(body)` | `POST /v1/payment-pages/pool-wallets` |
| `client.paymentPages.createPayment(body)` | `POST /v1/payment-pages/payments` |

### Contracts

Dashboard/JWT routes documented on [smart contract monitoring](https://chain-monitor.online/smart-contract-monitoring): `GET/POST /contracts`, `PATCH/DELETE /contracts/:id`, `POST /contracts/:id/toggle`, `POST /contracts/validate`.

### Profile & balance (dashboard JWT)

`GET /me`, `GET /balance`, `GET /balance/transactions`. These unversioned routes are not part of the API-key `/v1` surface.

## Webhook payload

```json
{
  "eventType": "transaction_confirmed",
  "userId": "uuid",
  "correlationId": "tx-0x...-transaction_confirmed-timestamp",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "txHash": "0x...",
    "network": "Ethereum",
    "blockNumber": 19485738,
    "direction": "in",
    "asset": "USDT",
    "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "amount": "250.00",
    "from": "0x...",
    "to": "0x...",
    "timestamp": "2024-01-15T10:30:00Z",
    "confirmations": 12,
    "requiredConfirmations": 12
  }
}
```

`contractAddress` is `null` for a native coin. Verify the signature over the **raw** body. Full example: [`examples/webhook-receiver-express.ts`](examples/webhook-receiver-express.ts).

## Errors

- `MonitorTxsApiError` — HTTP error (`status`, `data`, `requestId`)
- `MonitorTxsNetworkError` — transport failure
- `MonitorTxsTimeoutError` — aborted by timeout
- `MonitorTxsWebhookError` — payload parse / missing secret for `computeWebhookSignature`

## Examples and guides

- [`examples/detect-usdt-trc20-deposits.ts`](examples/detect-usdt-trc20-deposits.ts) — USDT TRC-20 payment gateway
- [`examples/monitor-evm-wallet.ts`](examples/monitor-evm-wallet.ts) — Ethereum / BSC ERC-20 / BEP-20
- [`examples/webhook-receiver-express.ts`](examples/webhook-receiver-express.ts) — Express + signature check
- [`examples/telegram-alerts.ts`](examples/telegram-alerts.ts) — `notifySettings.telegram`
- [How to detect USDT payments automatically](docs/guides/detect-usdt-payments.md)
- [Verify blockchain webhook signatures](docs/guides/verify-webhook-signatures.md)
- [When to credit a deposit](docs/guides/detected-vs-confirmed.md)
- [TRC-20 vs ERC-20](docs/guides/trc20-vs-erc20.md)

## Compatibility

- Node.js 18+
- TypeScript 5+
