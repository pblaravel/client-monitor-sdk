import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  WEBHOOK_SIGNATURE_HEADER,
  computeWebhookSignature,
  getWebhookSignatureHeader,
  isConfirmedEvent,
  isDetectedEvent,
  isWebhookPayload,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '../src/index';
import { MonitorTxsWebhookError } from '../src/errors';

const SECRET = 'whsec_0123456789abcdef0123456789abcdef';

const CONFIRMED_PAYLOAD = {
  eventType: 'transaction_confirmed' as const,
  userId: 'user-1',
  correlationId: 'tx-0xabc-transaction_confirmed-timestamp',
  timestamp: '2024-01-15T10:30:00Z',
  data: {
    txHash: '0xabc',
    network: 'Ethereum',
    blockNumber: 19485738,
    direction: 'in',
    asset: 'USDT',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    amount: '250.00',
    from: '0xfrom',
    to: '0xto',
    timestamp: '2024-01-15T10:30:00Z',
    confirmations: 12,
    requiredConfirmations: 12,
  },
};

const DETECTED_PAYLOAD = {
  ...CONFIRMED_PAYLOAD,
  eventType: 'transaction_detected' as const,
  correlationId: 'tx-0xabc-transaction_detected-timestamp',
  data: {
    ...CONFIRMED_PAYLOAD.data,
    confirmations: 0,
  },
};

const rawBody = (payload: unknown): Buffer => Buffer.from(JSON.stringify(payload), 'utf8');

describe('webhook signature helper', () => {
  it('computes HMAC-SHA256 hex of the raw body with the UTF-8 secret', () => {
    const body = rawBody(CONFIRMED_PAYLOAD);
    const expected = createHmac('sha256', SECRET).update(body).digest('hex');
    assert.equal(computeWebhookSignature(body, SECRET), expected);
    assert.equal(computeWebhookSignature(body, SECRET).length, 64);
    assert.match(computeWebhookSignature(body, SECRET), /^[0-9a-f]{64}$/);
  });

  it('accepts a matching X-Webhook-Signature header', () => {
    const body = rawBody(CONFIRMED_PAYLOAD);
    const signature = computeWebhookSignature(body, SECRET);
    assert.equal(
      verifyWebhookSignature({ rawBody: body, signatureHeader: signature, secret: SECRET }),
      true
    );
  });

  it('accepts any matching digest in a comma-separated multi-key header', () => {
    const body = rawBody(CONFIRMED_PAYLOAD);
    const signature = computeWebhookSignature(body, SECRET);
    const header = `deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef, ${signature.toUpperCase()}`;
    assert.equal(
      verifyWebhookSignature({ rawBody: body, signatureHeader: header, secret: SECRET }),
      true
    );
  });

  it('rejects a tampered body, a wrong secret, and a missing header', () => {
    const body = rawBody(CONFIRMED_PAYLOAD);
    const signature = computeWebhookSignature(body, SECRET);
    const tampered = Buffer.from(`${body.toString('utf8')} `, 'utf8');

    assert.equal(
      verifyWebhookSignature({ rawBody: tampered, signatureHeader: signature, secret: SECRET }),
      false
    );
    assert.equal(
      verifyWebhookSignature({ rawBody: body, signatureHeader: signature, secret: 'whsec_other' }),
      false
    );
    assert.equal(
      verifyWebhookSignature({ rawBody: body, signatureHeader: '', secret: SECRET }),
      false
    );
    assert.equal(
      verifyWebhookSignature({ rawBody: body, signatureHeader: null, secret: SECRET }),
      false
    );
  });

  it('does not verify a re-serialized parsed object in place of the raw body', () => {
    const canonical = '{"eventType":"transaction_confirmed","userId":"u","timestamp":"t","data":{"txHash":"0x1","network":"ETH","direction":"in","asset":"USDT","amount":"1","from":"a","to":"b","timestamp":"t"}}';
    const signature = computeWebhookSignature(canonical, SECRET);
    const pretty = JSON.stringify(JSON.parse(canonical), null, 2);
    assert.equal(
      verifyWebhookSignature({ rawBody: pretty, signatureHeader: signature, secret: SECRET }),
      false
    );
  });

  it('reads X-Webhook-Signature regardless of header casing', () => {
    const signature = 'ab'.repeat(32);
    assert.equal(WEBHOOK_SIGNATURE_HEADER, 'X-Webhook-Signature');
    assert.equal(getWebhookSignatureHeader({ 'X-Webhook-Signature': signature }), signature);
    assert.equal(getWebhookSignatureHeader({ 'x-webhook-signature': signature }), signature);
  });
});

describe('webhook payload types', () => {
  it('accepts both current event types and rejects unknown ones', () => {
    assert.equal(isWebhookPayload(CONFIRMED_PAYLOAD), true);
    assert.equal(isWebhookPayload(DETECTED_PAYLOAD), true);
    assert.equal(isConfirmedEvent(CONFIRMED_PAYLOAD), true);
    assert.equal(isDetectedEvent(DETECTED_PAYLOAD), true);
    assert.equal(isWebhookPayload({ ...CONFIRMED_PAYLOAD, eventType: 'transaction_mined' }), false);
    assert.equal(isWebhookPayload({ ...CONFIRMED_PAYLOAD, data: { ...CONFIRMED_PAYLOAD.data, amount: 250 } }), false);
  });

  it('parses a raw body into a typed payload', () => {
    const payload = parseWebhookPayload(rawBody(DETECTED_PAYLOAD));
    assert.equal(payload.eventType, 'transaction_detected');
    assert.equal(payload.data.confirmations, 0);
    assert.equal(payload.data.contractAddress, CONFIRMED_PAYLOAD.data.contractAddress);
    assert.throws(() => parseWebhookPayload('not-json'), MonitorTxsWebhookError);
    assert.throws(() => parseWebhookPayload('{"eventType":"nope"}'), MonitorTxsWebhookError);
  });
});
