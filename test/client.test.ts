import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MonitorTxsApiError, MonitorTxsClient } from '../src/index';
import type { CreateWalletDTO, NotifySettings } from '../src/types';

type RecordedCall = {
  url: string;
  method?: string;
  headers: Headers;
  body?: unknown;
};

const jsonResponse = (data: unknown, status = 200, extraHeaders?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });

const createClient = (calls: RecordedCall[], options: ConstructorParameters<typeof MonitorTxsClient>[0] = {}) =>
  new MonitorTxsClient({
    baseUrl: 'https://api.chain-monitor.online',
    fetchFn: async (input, init) => {
      const headers = new Headers(init?.headers);
      let body: unknown;
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
      }
      calls.push({
        url: String(input),
        method: init?.method,
        headers,
        body,
      });
      return jsonResponse({});
    },
    ...options,
  });

describe('MonitorTxsClient routing and auth', () => {
  it('uses /v1 for wallets and notifications when the token is an API key', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(calls, { apiKey: 'api_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' });

    await client.wallets.list();
    await client.wallets.create({
      address: 'TXYZ',
      networkUuid: 'net',
      tokenUuids: ['tok'],
      notifySettings: { webhook: true, onConfirmed: true, onDetected: false },
    });
    await client.notifications.list({ limit: 25, offset: 0 });
    await client.notifications.getTxRaw('notif-1');

    assert.equal(calls[0].url, 'https://api.chain-monitor.online/v1/wallets');
    assert.equal(calls[1].url, 'https://api.chain-monitor.online/v1/wallets');
    assert.equal(calls[1].method, 'POST');
    assert.deepEqual((calls[1].body as CreateWalletDTO).notifySettings, {
      webhook: true,
      onConfirmed: true,
      onDetected: false,
    } satisfies NotifySettings);
    assert.equal(
      calls[2].url,
      'https://api.chain-monitor.online/v1/notifications?limit=25&offset=0'
    );
    assert.equal(calls[3].url, 'https://api.chain-monitor.online/v1/notifications/notif-1/tx-raw');
    assert.equal(
      calls[0].headers.get('authorization'),
      'Bearer api_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    );
  });

  it('keeps unversioned wallet routes for dashboard JWT tokens', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(calls, { authToken: 'eyJhbGciOiJIUzI1NiJ9.e30.sig' });

    await client.wallets.list();
    await client.notifications.get('n1');
    await client.profile.get();
    await client.balance.get();

    assert.equal(calls[0].url, 'https://api.chain-monitor.online/wallets');
    assert.equal(calls[1].url, 'https://api.chain-monitor.online/notifications/n1');
    assert.equal(calls[2].url, 'https://api.chain-monitor.online/me');
    assert.equal(calls[3].url, 'https://api.chain-monitor.online/balance');
  });

  it('exposes public, payment-page and contract endpoints', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(calls, { apiKey: 'api_key_abc' });

    await client.public.getNetworks();
    await client.public.getPackCredits();
    await client.paymentPages.addPoolWallet({
      paymentPageUuid: 'page',
      wallet: '0x1',
      networkUuid: 'net',
    });
    await client.paymentPages.createPayment({
      paymentPageUuid: 'page',
      networkUuid: 'net',
      tokenUuid: 'tok',
      amount: '100.50',
    });
    await client.contracts.create({
      networkUuid: 'net',
      address: '0xdac',
      notifySettings: { webhook: true },
    });
    await client.contracts.validate({ networkUuid: 'net', address: '0xdac' });

    assert.equal(calls[0].url, 'https://api.chain-monitor.online/public/networks');
    assert.equal(calls[0].headers.get('authorization'), null);
    assert.equal(calls[1].url, 'https://api.chain-monitor.online/public/pack-credits');
    assert.equal(calls[2].url, 'https://api.chain-monitor.online/v1/payment-pages/pool-wallets');
    assert.equal(calls[3].url, 'https://api.chain-monitor.online/v1/payment-pages/payments');
    assert.equal(calls[4].url, 'https://api.chain-monitor.online/contracts');
    assert.equal(calls[5].url, 'https://api.chain-monitor.online/contracts/validate');
  });

  it('can force /v1 even for non-api-key tokens', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(calls, { authToken: 'session-token', apiPrefix: '/v1' });
    await client.wallets.toggle('w1');
    assert.equal(calls[0].url, 'https://api.chain-monitor.online/v1/wallets/w1/toggle');
  });

  it('surfaces API errors with request id from x-correlation-id', async () => {
    const client = new MonitorTxsClient({
      apiKey: 'api_key_abc',
      fetchFn: async () =>
        jsonResponse(
          { message: 'Invalid or inactive API key', error: 'Unauthorized' },
          401,
          { 'x-correlation-id': 'corr-1' }
        ),
    });

    await assert.rejects(
      () => client.wallets.list(),
      (error: unknown) => {
        assert.ok(error instanceof MonitorTxsApiError);
        assert.equal(error.status, 401);
        assert.equal(error.message, 'Invalid or inactive API key');
        assert.equal(error.requestId, 'corr-1');
        return true;
      }
    );
  });
});
