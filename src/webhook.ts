import { createHmac, timingSafeEqual } from 'node:crypto';
import { MonitorTxsWebhookError } from './errors';
import { WEBHOOK_SIGNATURE_HEADER, type WebhookEventType, type WebhookPayload } from './types';

export type WebhookBody = Buffer | Uint8Array | string;

export type VerifyWebhookSignatureInput = {
  rawBody: WebhookBody;
  /**
   * Value of the `X-Webhook-Signature` header.
   * One lowercase hex digest, or several comma-separated digests when multiple API keys are active.
   */
  signatureHeader: string | string[] | null | undefined;
  /** Signing secret shown once in Dashboard → API (`whsec_…`). Used as UTF-8 HMAC key. */
  secret: string;
};

const toBuffer = (body: WebhookBody): Buffer => {
  if (typeof body === 'string') {
    return Buffer.from(body, 'utf8');
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  return Buffer.from(body);
};

const normalizeSignatureHeader = (header: string | string[] | null | undefined): string => {
  if (header == null) {
    return '';
  }
  const raw = Array.isArray(header) ? header.join(',') : header;
  return raw.trim().toLowerCase();
};

/**
 * HMAC-SHA256 hex digest of the raw webhook body.
 * Matches `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.
 */
export const computeWebhookSignature = (rawBody: WebhookBody, secret: string): string => {
  if (!secret) {
    throw new MonitorTxsWebhookError('Webhook signing secret is required');
  }
  return createHmac('sha256', secret).update(toBuffer(rawBody)).digest('hex');
};

/**
 * Verify `X-Webhook-Signature` against the raw request body.
 *
 * Uses the exact bytes received — do not `JSON.stringify` a parsed object.
 * The header is valid when any comma-separated part matches the HMAC-SHA256 hex digest.
 * Comparison is constant-time.
 */
export const verifyWebhookSignature = (input: VerifyWebhookSignatureInput): boolean => {
  const { rawBody, signatureHeader, secret } = input;
  if (!secret) {
    return false;
  }

  const header = normalizeSignatureHeader(signatureHeader);
  if (!header) {
    return false;
  }

  const expected = computeWebhookSignature(rawBody, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');

  return header.split(',').some((part) => {
    const candidate = Buffer.from(part.trim(), 'utf8');
    return candidate.length === expectedBuf.length && timingSafeEqual(candidate, expectedBuf);
  });
};

export const getWebhookSignatureHeader = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const direct = headers[WEBHOOK_SIGNATURE_HEADER] ?? headers[WEBHOOK_SIGNATURE_HEADER.toLowerCase()];
  if (direct == null) {
    return undefined;
  }
  return Array.isArray(direct) ? direct.join(',') : direct;
};

export const isWebhookEventType = (value: unknown): value is WebhookEventType =>
  value === 'transaction_confirmed' || value === 'transaction_detected';

export const isConfirmedEvent = (
  payload: Pick<WebhookPayload, 'eventType'>
): boolean => payload.eventType === 'transaction_confirmed';

export const isDetectedEvent = (
  payload: Pick<WebhookPayload, 'eventType'>
): boolean => payload.eventType === 'transaction_detected';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isWebhookPayload = (value: unknown): value is WebhookPayload => {
  if (!isRecord(value) || !isWebhookEventType(value.eventType)) {
    return false;
  }
  if (typeof value.userId !== 'string' || typeof value.timestamp !== 'string') {
    return false;
  }
  if (!isRecord(value.data)) {
    return false;
  }
  const data = value.data;
  return (
    typeof data.txHash === 'string' &&
    typeof data.network === 'string' &&
    typeof data.direction === 'string' &&
    typeof data.asset === 'string' &&
    typeof data.amount === 'string' &&
    typeof data.from === 'string' &&
    typeof data.to === 'string' &&
    typeof data.timestamp === 'string'
  );
};

export const parseWebhookPayload = (rawBody: WebhookBody): WebhookPayload => {
  const text = typeof rawBody === 'string' ? rawBody : toBuffer(rawBody).toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new MonitorTxsWebhookError('Webhook body is not valid JSON');
  }
  if (!isWebhookPayload(parsed)) {
    throw new MonitorTxsWebhookError('Webhook body is not a Chain Monitor transaction payload');
  }
  return parsed;
};
