# transaction_detected vs transaction_confirmed: when to credit a deposit

Chain Monitor emits two `eventType` values. They are **not** interchangeable, and each delivered alert costs **1 credit**.

| Event | When it fires | Confirmations in the payload | Default on new wallets |
|-------|----------------|------------------------------|-------------------------|
| `transaction_confirmed` | After the network confirmation depth | `confirmations` / `requiredConfirmations` for that network | `onConfirmed: true` |
| `transaction_detected` | When the transfer is first seen in a block | `confirmations` is 0 extra confirmations | `onDetected: false` |

The previous single event was named `transaction_detected` and already meant “after confirmation depth”. That event was **renamed** to `transaction_confirmed`. Integrations that switch on `eventType` must accept `transaction_confirmed`.

## Per-wallet flags

```ts
notifySettings: {
  onDetected: false,
  onConfirmed: true,
}
```

Rules from the product:

- New wallets default to `onConfirmed=true`, `onDetected=false`
- At least one of the two must be true
- Both on = **two alerts** (and **2 credits**) for the same transfer

## When to credit a user balance

Credit on **`transaction_confirmed`**.

That event waits for the network’s confirmation depth. The JSON includes `confirmations` and `requiredConfirmations` so you can log what the service considered final.

```ts
import { isConfirmedEvent, parseWebhookPayload } from '@chainmonitor/client-monitor-sdk';

const payload = parseWebhookPayload(rawBody);

if (isConfirmedEvent(payload) && payload.data.direction === 'in') {
  await creditOnce(payload.data.txHash, payload.data.amount);
}
```

Use `txHash` (and `eventType` if you store both) as an idempotency key. Failed webhook deliveries may be retried.

## What `transaction_detected` is for

Enable `onDetected` when you want an earlier signal — for example a “payment seen, waiting for confirmations” state in a UI or ops channel.

Do **not** treat detected as final:

- The transfer was only included in a block (0 extra confirmations)
- Reorgs and chain-specific finality still apply until the confirmed event
- You will pay a second credit when `transaction_confirmed` arrives if both flags are on

A typical payment-gateway setting:

```ts
notifySettings: {
  webhook: true,
  notifyIncoming: true,
  notifyOutgoing: false,
  onDetected: false,
  onConfirmed: true,
}
```

If you enable both, update pending state on detected and settle only on confirmed.

## Payload fields shared by both events

`eventType`, `userId`, optional `correlationId`, `timestamp`, and `data`:

`txHash`, `network`, `blockNumber`, `direction`, `asset`, `contractAddress` (null for a native coin), `amount`, `from`, `to`, `timestamp`, `confirmations`, `requiredConfirmations`, plus explorer links when present.

See [Verify webhook signatures](./verify-webhook-signatures.md) and the [API reference](https://chain-monitor.online/docs/api).
