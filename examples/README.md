# Examples

Runnable scripts for [@chainmonitor/client-monitor-sdk](https://github.com/pblaravel/client-monitor-sdk). Create an API key in [Dashboard → API](https://chain-monitor.online) and a webhook signing secret (`whsec_…`) if you receive webhooks.

```bash
npm install
npx tsx examples/detect-usdt-trc20-deposits.ts
```

| File | What it shows |
|------|----------------|
| `detect-usdt-trc20-deposits.ts` | Payment-gateway monitor for USDT TRC-20 deposits on TRON |
| `monitor-evm-wallet.ts` | Ethereum / BSC wallet monitor for ERC-20 or BEP-20 transfers |
| `webhook-receiver-express.ts` | Express handler with HMAC verification and both event types |
| `telegram-alerts.ts` | Enable Telegram delivery via `notifySettings.telegram` |

Network and token UUIDs are resolved at runtime from `GET /public/networks` (Ethereum’s live slug is `eth`).

See also the [guides](../docs/guides) and the [REST API reference](https://chain-monitor.online/docs/api).
