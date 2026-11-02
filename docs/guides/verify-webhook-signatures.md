# Verify blockchain webhook signatures

Every Chain Monitor webhook can include `X-Webhook-Signature`. The value is an HMAC-SHA256 digest of the **raw HTTP body**, encoded as 64 lowercase hex characters. The signing secret (`whsec_…`) belongs to an API key and is shown once in **Dashboard → API** when that pair is created or rotated.

## Algorithm (exact)

Let `rawBody` be the bytes received on the wire (before `JSON.parse`). Let `secret` be the full `whsec_…` string interpreted as UTF-8.

```
signature_hex = HMAC-SHA256(key = secret as UTF-8, message = rawBody)
X-Webhook-Signature = signature_hex
```

With several active API-key pairs the header contains one digest per secret, separated by commas. The header is valid when **any** part matches.

In Node.js this is:

```ts
crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
```

If no active key has a signing secret, the header is omitted.

## Use the SDK helper

```ts
import {
  parseWebhookPayload,
  verifyWebhookSignature,
} from '@chainmonitor/client-monitor-sdk';

const valid = verifyWebhookSignature({
  rawBody, // Buffer | Uint8Array | string of the exact bytes
  signatureHeader: request.headers['x-webhook-signature'],
  secret: process.env.CHAIN_MONITOR_WEBHOOK_SECRET, // whsec_...
});

if (!valid) {
  // reject — 401
}

const payload = parseWebhookPayload(rawBody);
```

The helper lowercases the header, splits on commas, and compares with `crypto.timingSafeEqual`.

## Express: keep the raw body

```ts
import express from 'express';
import { verifyWebhookSignature, parseWebhookPayload } from '@chainmonitor/client-monitor-sdk';

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const ok = verifyWebhookSignature({
    rawBody: req.body,
    signatureHeader: req.get('x-webhook-signature'),
    secret: process.env.CHAIN_MONITOR_WEBHOOK_SECRET!,
  });
  if (!ok) return res.status(401).send('invalid signature');

  const payload = parseWebhookPayload(req.body);
  res.status(200).send('ok');
});
```

`express.json()` parses first and you lose the original bytes. Do not `JSON.stringify` the parsed object — whitespace and key order must match what was sent.

## Mistakes that fail verification

- Re-serializing a parsed JSON object
- Trimming or altering the body before HMAC
- Comparing hex strings with `===` instead of a length-checked timing-safe compare
- Using only part of the `whsec_…` secret, or a different key than the one that signed the delivery

Return HTTP 2xx to accept a delivery. Other statuses may trigger retries.

Full walkthrough: [REST API — Webhooks](https://chain-monitor.online/docs/api). Runnable receiver: [`examples/webhook-receiver-express.ts`](../../examples/webhook-receiver-express.ts).
