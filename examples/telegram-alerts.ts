/**
 * Deliver matching transfers to Telegram (and optionally a webhook).
 *
 * Connect Telegram once in the Chain Monitor dashboard, then enable
 * `notifySettings.telegram` on the wallet. The service sends the alert;
 * this script does not call the Telegram Bot API.
 *
 *   CHAIN_MONITOR_API_KEY=api_key_xxx \
 *   WALLET_ADDRESS=0x... \
 *   NETWORK=eth \
 *   npx tsx examples/telegram-alerts.ts
 */
import { MonitorTxsClient, requireNetwork, requireToken } from '../src';

const apiKey = process.env.CHAIN_MONITOR_API_KEY;
const address = process.env.WALLET_ADDRESS;
const networkSlug = process.env.NETWORK ?? 'eth';
const tokenSlug = process.env.TOKEN ?? 'usdt';

if (!apiKey || !address) {
  throw new Error('Set CHAIN_MONITOR_API_KEY and WALLET_ADDRESS');
}

const client = new MonitorTxsClient({ apiKey });

const networks = await client.public.getNetworks();
const network = requireNetwork(networks, networkSlug);
const token = requireToken(network, { slug: tokenSlug });

const wallet = await client.wallets.create({
  address,
  networkUuid: network.id,
  tokenUuids: [token.id],
  minAmount: process.env.MIN_AMOUNT ?? '0',
  webhookUrl: process.env.WEBHOOK_URL,
  notifySettings: {
    telegram: true,
    webhook: Boolean(process.env.WEBHOOK_URL),
    notifyIncoming: true,
    notifyOutgoing: true,
    onDetected: false,
    onConfirmed: true,
  },
});

console.log('Telegram alerts enabled for', {
  walletId: wallet.id,
  address: wallet.address,
  network: network.slug,
  token: token.slug,
  webhook: Boolean(process.env.WEBHOOK_URL),
});
