# How to detect USDT payments automatically

Chain Monitor watches a **public address on one network**. USDT on TRON (TRC-20), Ethereum (ERC-20) and BSC (BEP-20) are different tokens on different ledgers — create one monitor per chain.

This guide credits an order after a **confirmed** incoming USDT transfer.

## 1. Create an account and an API key

1. Register at [chain-monitor.online](https://chain-monitor.online). New accounts receive **1000 welcome credits**. No card is required.
2. Open **Dashboard → API** and create a key (`api_key_…`). Store the webhook signing secret (`whsec_…`) shown at the same time.

One credit is spent per delivered alert. Quiet wallets do not spend credits.

## 2. Resolve network and token UUIDs

Do not hard-code UUIDs. Load them from `GET /public/networks`:

```ts
import { MonitorTxsClient, requireNetwork, requireToken } from '@chainmonitor/client-monitor-sdk';

const client = new MonitorTxsClient({ apiKey: process.env.CHAIN_MONITOR_API_KEY });
const networks = await client.public.getNetworks();

const tron = requireNetwork(networks, 'tron');
const usdt = requireToken(tron, { slug: 'usdt', type: 'token' });
```

Ethereum’s live slug is `eth` (the docs sometimes write `ethereum`). The helper accepts both.

## 3. Create a deposit monitor

```ts
const wallet = await client.wallets.create({
  address: 'TYourTronDepositAddress',
  networkUuid: tron.id,
  tokenUuids: [usdt.id],
  minAmount: '10',
  webhookUrl: 'https://your-app.example/webhooks/chain-monitor',
  notifySettings: {
    webhook: true,
    notifyIncoming: true,
    notifyOutgoing: false,
    onDetected: false,
    onConfirmed: true,
  },
});
```

Defaults if you omit the event flags: `onConfirmed=true`, `onDetected=false`. At least one must be true. Keep `onDetected` off for payments unless you also handle the later confirmed event (each event costs 1 credit).

## 4. Credit the order on `transaction_confirmed`

```ts
import {
  isConfirmedEvent,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '@chainmonitor/client-monitor-sdk';

if (!verifyWebhookSignature({ rawBody, signatureHeader, secret })) {
  throw new Error('invalid signature');
}

const payload = parseWebhookPayload(rawBody);
if (!isConfirmedEvent(payload)) return;
if (payload.data.direction !== 'in') return;
if (payload.data.asset !== 'USDT') return;

await creditOrder({
  txHash: payload.data.txHash,
  amount: payload.data.amount,
  to: payload.data.to,
});
```

Treat `txHash` as an idempotency key so retries do not credit twice.

## 5. Optional: payment pages

If you use a dashboard payment page, reserve a pool address with `client.paymentPages.createPayment(...)` (`POST /v1/payment-pages/payments`). The response includes `paymentUrl` and the reserved `wallet`. Match the webhook `data.to` / `data.amount` against that payment.

## Related

- [TRC-20 vs ERC-20 deposit monitoring](./trc20-vs-erc20.md)
- [transaction_detected vs transaction_confirmed](./detected-vs-confirmed.md)
- [Verify webhook signatures](./verify-webhook-signatures.md)
- Product pages: [USDT monitoring](https://chain-monitor.online/usdt-monitoring), [TRC-20 monitoring](https://chain-monitor.online/trc20-monitoring), [REST API](https://chain-monitor.online/docs/api)
