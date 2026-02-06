# @monitor-txs/client-monitor-sdk

Клиентский SDK для работы с API сервиса мониторинга транзакций ChainPing.

## Возможности

- Готовые методы для ключевых клиентских эндпоинтов
- Единая обработка ошибок и таймаутов
- Гибкая настройка базового URL

## Установка

```bash
npm install @monitor-txs/client-monitor-sdk
```

## Быстрый старт

```ts
import { MonitorTxsClient } from '@monitor-txs/client-monitor-sdk';

const client = new MonitorTxsClient();

const networks = await client.public.getNetworks();
const profile = await client.profile.get();
```

По умолчанию SDK подключается к `https://api.chain-monitor.online`.

## Конфигурация

```ts
const client = new MonitorTxsClient({
  baseUrl: 'https://api.chain-monitor.online',
  timeoutMs: 15000,
  defaultHeaders: {
    'X-Client': 'my-app',
  },
  retry: {
    retries: 2,
    delayMs: 300,
  },
});
```

Можно отключить Authorization для конкретного запроса:

```ts
await client.request('GET', '/public/networks', { auth: false });
```

## Ошибки

SDK выбрасывает специальные ошибки:

- `MonitorTxsApiError` — ответ API с `status`, `data`, `requestId`
- `MonitorTxsNetworkError` — сетевые ошибки
- `MonitorTxsTimeoutError` — таймаут запроса

```ts
import { MonitorTxsApiError } from '@monitor-txs/client-monitor-sdk';

try {
  await client.profile.get();
} catch (error) {
  if (error instanceof MonitorTxsApiError) {
    console.error(error.status, error.data);
  }
}
```

## Основные методы

### Profile

```ts
const profile = await client.profile.get();
```

### Wallets

```ts
const wallet = await client.wallets.create({
  address: '0x...',
  networkUuid: '...',
  tokenUuids: ['...'],
});
```

### Notifications

```ts
const list = await client.notifications.list({ limit: 20, offset: 0 });
const item = await client.notifications.get('<notification-id>');
```

### Public

```ts
const networks = await client.public.getNetworks();
```

### Balance

```ts
const balance = await client.balance.get();
const history = await client.balance.getTransactions({ limit: 50 });
```


## Низкоуровневый доступ

Если нужен кастомный запрос, используйте `request`:

```ts
const response = await client.request('GET', '/custom-endpoint', {
  query: { limit: 10 },
});
```

## Совместимость

- Node.js 18+
- TypeScript 5+
