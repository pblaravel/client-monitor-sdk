/**
 * Payment-gateway flow: watch a TRON T-address for confirmed USDT (TRC-20) deposits.
 *
 *   CHAIN_MONITOR_API_KEY=api_key_xxx \
 *   DEPOSIT_ADDRESS=T... \
 *   WEBHOOK_URL=https://your-app.example/webhooks/chain-monitor \
 *   npx tsx examples/detect-usdt-trc20-deposits.ts
 *
 * Credit an order only after `transaction_confirmed` (see docs/guides/detected-vs-confirmed.md).
 */
import { MonitorTxsClient, requireNetwork, requireToken } from '../src';

const apiKey = process.env.CHAIN_MONITOR_API_KEY;
const address = process.env.DEPOSIT_ADDRESS;
const webhookUrl = process.env.WEBHOOK_URL;

if (!apiKey || !address || !webhookUrl) {
  throw new Error('Set CHAIN_MONITOR_API_KEY, DEPOSIT_ADDRESS and WEBHOOK_URL');
}

const client = new MonitorTxsClient({ apiKey });

const networks = await client.public.getNetworks();
const tron = requireNetwork(networks, 'tron');
const usdt = requireToken(tron, { slug: 'usdt', type: 'token' });

const wallet = await client.wallets.create({
  address,
  networkUuid: tron.id,
  tokenUuids: [usdt.id],
  minAmount: process.env.MIN_AMOUNT ?? '1',
  webhookUrl,
  notifySettings: {
    webhook: true,
    telegram: false,
    notifyIncoming: true,
    notifyOutgoing: false,
    onDetected: false,
    onConfirmed: true,
  },
});

console.log('Watching TRC-20 USDT deposits', {
  walletId: wallet.id,
  address: wallet.address,
  network: tron.slug,
  token: usdt.slug,
  status: wallet.status,
});
