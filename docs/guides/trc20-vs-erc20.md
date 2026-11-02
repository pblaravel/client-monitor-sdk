# TRC-20 vs ERC-20 deposit monitoring

USDT (and other tokens) are **not** interchangeable across chains. A TRON TRC-20 transfer never appears on an Ethereum ERC-20 monitor, and the reverse is also true. Chain Monitor attaches each wallet to a single network from `GET /public/networks`.

## Address formats

| Standard | Network slug | Address shape | Typical asset slug |
|----------|--------------|---------------|--------------------|
| TRC-20 | `tron` | Public `T…` address | `usdt` |
| ERC-20 | `eth` | `0x…` | `usdt` |
| BEP-20 | `bsc` | `0x…` | `usdt` |

The service rejects the wrong format at create time. An Ethereum `0x` address is not a TRON deposit address.

Ethereum’s live slug is `eth`. The SDK’s `findNetwork` / `requireNetwork` helpers also accept `ethereum`.

## One monitor per rail

Payment desks that accept USDT on several chains create **one wallet monitor per network**:

```ts
const networks = await client.public.getNetworks();

const tronUsdt = await client.wallets.create({
  address: tronAddress,
  networkUuid: requireNetwork(networks, 'tron').id,
  tokenUuids: [requireToken(requireNetwork(networks, 'tron'), { slug: 'usdt' }).id],
  webhookUrl,
  notifySettings: { webhook: true, notifyIncoming: true, onConfirmed: true },
});

const ethUsdt = await client.wallets.create({
  address: evmAddress,
  networkUuid: requireNetwork(networks, 'eth').id,
  tokenUuids: [requireToken(requireNetwork(networks, 'eth'), { slug: 'usdt' }).id],
  webhookUrl,
  notifySettings: { webhook: true, notifyIncoming: true, onConfirmed: true },
});
```

Pick the token from that network’s list. Do not paste a contract address into a **wallet** monitor — wallet monitors watch transfers involving the wallet. To watch a token contract itself, use [smart contract monitoring](https://chain-monitor.online/smart-contract-monitoring) (`POST /contracts`).

## Same webhook shape

Both rails POST the same JSON. Distinguish them with `data.network`, `data.contractAddress` and `data.to`:

- TRC-20 USDT: `to` is a `T…` address; `contractAddress` is the TRC-20 contract
- ERC-20 USDT: `to` is `0x…`; `contractAddress` is the ERC-20 contract (native coins send `contractAddress: null`)

Credit only on `transaction_confirmed`. Confirmation depth is per network; read `confirmations` and `requiredConfirmations` on the payload instead of assuming a fixed number.

## Fees and confirmation time

TRON is a common low-fee rail for USDT deposits; Ethereum L1 confirmation depth is deeper. The product does not promise a delivery SLA. Handle both events only if you need an early “seen in a block” signal — that costs an extra credit.

## Related product pages

- [USDT monitoring](https://chain-monitor.online/usdt-monitoring)
- [TRC-20 monitoring](https://chain-monitor.online/trc20-monitoring)
- [Wallet monitoring](https://chain-monitor.online/wallet-monitoring)
- Runnable samples: [`examples/detect-usdt-trc20-deposits.ts`](../../examples/detect-usdt-trc20-deposits.ts), [`examples/monitor-evm-wallet.ts`](../../examples/monitor-evm-wallet.ts)
