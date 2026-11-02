# Changelog

## 1.1.0

Aligns the SDK with the current Chain Monitor API ([docs](https://chain-monitor.online/docs/api), live `GET /public/networks`).

### Added

- Webhook helpers: `verifyWebhookSignature`, `computeWebhookSignature`, `parseWebhookPayload`, `isConfirmedEvent` / `isDetectedEvent`, header constant `X-Webhook-Signature` (HMAC-SHA256 over the raw body; comma-separated multi-key headers).
- `notifySettings.onDetected` / `onConfirmed`, plus `notifyIncoming` / `notifyOutgoing`.
- Typed webhook payload (`transaction_confirmed` | `transaction_detected`) and notification list / `tx-raw` responses.
- `client.public.getPackCredits()`, `client.notifications.getTxRaw()`, `client.paymentPages.*`, `client.contracts.*`.
- `apiKey` constructor option; `apiPrefix: 'auto' | '/v1' | ''` (API keys use `/v1/wallets` and `/v1/notifications`).
- `findNetwork` / `requireNetwork` (including `ethereum` → `eth`) and `findToken` / `requireToken`.
- `PublicNetworkDTO.type` from the live catalog.
- Examples, guides, and tests for the new types and signature helper.

### Changed

- Published package name is `@chainmonitor/client-monitor-sdk` (npm and GitHub).
- Documented auth is an API key (`Bearer api_key_…`) from Dashboard → API. `authToken` still works (dashboard JWT or API key).
- Wallet and notification methods are versioned: `/v1/…` when the token starts with `api_key_`. JWT tokens keep the unversioned paths.
- Default types for wallets, notifications, balance, and profile are no longer `unknown`.
- README rewritten for the current product (Chain Monitor, networks, events, credits).
- Standalone `tsconfig` (no monorepo `extends`).

### Fixed

- Outdated `notifySettings` (channels only) and missing confirmation event model.
- Notifications treated as a bare array; the API-key list returns `{ notifications, total }`.
