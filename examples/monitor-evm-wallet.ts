/**
 * Watch an Ethereum or BSC address for ERC-20 / BEP-20 transfers (USDT by default).
 *
 *   CHAIN_MONITOR_API_KEY=api_key_xxx \
 *   WALLET_ADDRESS=0x... \
 *   NETWORK=eth \
 *   WEBHOOK_URL=https://your-app.example/webhooks/chain-monitor \
 *   npx tsx examples/monitor-evm-wallet.ts
 *
 * NETWORK=eth  → Ethereum (API slug is `eth`, not `ethereum`)
 * NETWORK=bsc  → BNB Smart Chain
 */
import { MonitorTxsClient, requireNetwork, requireToken } from '../src';

const apiKey = process.env.CHAIN_MONITOR_API_KEY;
const address = process.env.WALLET_ADDRESS;
const webhookUrl = process.env.WEBHOOK_URL;
const networkSlug = process.env.NETWORK ?? 'eth';
const tokenSlug = process.env.TOKEN ?? 'usdt';

if (!apiKey || !address || !webhookUrl) {
  throw new Error('Set CHAIN_MONITOR_API_KEY, WALLET_ADDRESS and WEBHOOK_URL');
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
  webhookUrl,
  notifySettings: {
    webhook: true,
    notifyIncoming: true,
    notifyOutgoing: true,
    onDetected: false,
    onConfirmed: true,
  },
});

console.log('Watching EVM token transfers', {
  walletId: wallet.id,
  address: wallet.address,
  network: `${network.name} (${network.slug})`,
  networkType: network.type,
  token: `${token.name} (${token.slug})`,
  tokenType: token.type,
});
