/**
 * Express receiver that verifies X-Webhook-Signature and handles both event types.
 *
 *   npm install express
 *   CHAIN_MONITOR_WEBHOOK_SECRET=whsec_... npx tsx examples/webhook-receiver-express.ts
 *
 * Use `express.raw()` so the HMAC is computed over the exact bytes Chain Monitor sent.
 */
import express from 'express';
import {
  isConfirmedEvent,
  isDetectedEvent,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '../src';

const secret = process.env.CHAIN_MONITOR_WEBHOOK_SECRET;
const port = Number(process.env.PORT ?? 3000);

if (!secret) {
  throw new Error('Set CHAIN_MONITOR_WEBHOOK_SECRET to the whsec_… value from Dashboard → API');
}

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body as Buffer;
  const valid = verifyWebhookSignature({
    rawBody,
    signatureHeader: req.get('x-webhook-signature'),
    secret,
  });

  if (!valid) {
    res.status(401).send('invalid signature');
    return;
  }

  const payload = parseWebhookPayload(rawBody);

  if (isDetectedEvent(payload)) {
    // First sighting in a block (0 extra confirmations). Useful for UX, not for crediting.
    console.log('detected', {
      txHash: payload.data.txHash,
      asset: payload.data.asset,
      amount: payload.data.amount,
      confirmations: payload.data.confirmations,
      requiredConfirmations: payload.data.requiredConfirmations,
    });
  }

  if (isConfirmedEvent(payload)) {
    // Network confirmation depth reached. Safe point to credit a deposit.
    console.log('confirmed', {
      txHash: payload.data.txHash,
      network: payload.data.network,
      direction: payload.data.direction,
      asset: payload.data.asset,
      contractAddress: payload.data.contractAddress,
      amount: payload.data.amount,
      from: payload.data.from,
      to: payload.data.to,
      confirmations: payload.data.confirmations,
      requiredConfirmations: payload.data.requiredConfirmations,
    });
  }

  res.status(200).send('ok');
});

app.listen(port, () => {
  console.log(`Listening on http://127.0.0.1:${port}/webhook`);
});
