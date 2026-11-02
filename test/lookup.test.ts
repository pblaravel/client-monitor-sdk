import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findNetwork, findToken, requireNetwork, requireToken } from '../src/index';
import type { NotifySettings, PublicNetworkDTO, WebhookEventType } from '../src/types';

const networks: PublicNetworkDTO[] = [
  {
    id: 'eth-id',
    name: 'ETH',
    slug: 'eth',
    type: 'evm',
    tokens: [
      { id: 'eth-native', name: 'ETH', slug: 'eth', type: 'native' },
      { id: 'eth-usdt', name: 'USDT', slug: 'usdt', type: 'token' },
    ],
  },
  {
    id: 'tron-id',
    name: 'Tron',
    slug: 'tron',
    type: 'tron',
    tokens: [
      { id: 'trx', name: 'TRX', slug: 'trx', type: 'native' },
      { id: 'tron-usdt', name: 'USDT', slug: 'usdt', type: 'token' },
    ],
  },
];

describe('network and token lookup', () => {
  it('resolves live slugs and the ethereum → eth alias', () => {
    assert.equal(findNetwork(networks, 'eth')?.id, 'eth-id');
    assert.equal(findNetwork(networks, 'ethereum')?.id, 'eth-id');
    assert.equal(findNetwork(networks, 'tron')?.type, 'tron');
    assert.equal(requireNetwork(networks, 'ETH').slug, 'eth');
  });

  it('finds USDT by slug on the selected network', () => {
    const tron = requireNetwork(networks, 'tron');
    assert.equal(findToken(tron, { slug: 'usdt' })?.id, 'tron-usdt');
    assert.equal(requireToken(tron, { name: 'USDT', type: 'token' }).id, 'tron-usdt');
    assert.equal(findToken(tron, { slug: 'missing' }), undefined);
  });
});

describe('notify settings and event type surface', () => {
  it('includes onDetected / onConfirmed on NotifySettings', () => {
    const settings: NotifySettings = {
      webhook: true,
      telegram: false,
      notifyIncoming: true,
      notifyOutgoing: false,
      onDetected: false,
      onConfirmed: true,
    };
    assert.equal(settings.onDetected, false);
    assert.equal(settings.onConfirmed, true);

    const events: WebhookEventType[] = ['transaction_confirmed', 'transaction_detected'];
    assert.deepEqual(events, ['transaction_confirmed', 'transaction_detected']);
  });
});
