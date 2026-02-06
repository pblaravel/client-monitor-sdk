# @monitor-txs/client-monitor-sdk

Клиентский SDK для работы с API сервиса мониторинга транзакций ChainPing.

## Возможности

- Готовые методы для ключевых клиентских эндпоинтов
- Единая обработка ошибок и таймаутов
- Гибкая настройка базового URL и токена

## Установка

```bash
npm install @monitor-txs/client-monitor-sdk
```

## Быстрый старт

```ts
import { MonitorTxsClient } from '@monitor-txs/client-monitor-sdk';

const client = new MonitorTxsClient({ authToken: '<JWT>' });

const networks = await client.public.getNetworks();
const profile = await client.profile.get();
```

По умолчанию SDK подключается к `https://api.chain-monitor.online`.

## Конфигурация

```ts
const client = new MonitorTxsClient({
  baseUrl: 'https://api.chain-monitor.online',
  authToken: '<JWT>',
  timeoutMs: 15000,
  defaultHeaders: { 'X-Client': 'my-app' },
  retry: { retries: 2, delayMs: 300 },
});
```

Отключить Authorization для запроса: `client.request('GET', '/public/networks', { auth: false })`.

## Ошибки

- `MonitorTxsApiError` — ответ API (`status`, `data`, `requestId`)
- `MonitorTxsNetworkError` — сетевые ошибки
- `MonitorTxsTimeoutError` — таймаут запроса

---

## API: все методы и ответы

### Profile

| Метод | Описание | Ответ |
|-------|----------|--------|
| `client.profile.get()` | Профиль текущего пользователя | `Promise<Profile>` — объект профиля (id, email, name, role, createdAt, updatedAt и т.д.) |

```ts
const profile = await client.profile.get();
// { id: string, email: string, name: string | null, role: string, ... }
```

---

### Wallets

| Метод | Описание | Ответ |
|-------|----------|--------|
| `client.wallets.list()` | Список мониторов кошельков | `Promise<Wallet[]>` — массив кошельков |
| `client.wallets.create(body)` | Создать монитор кошелька | `Promise<Wallet>` — созданный кошелёк |
| `client.wallets.update(id, body)` | Обновить настройки монитора | `Promise<Wallet>` — обновлённый кошелёк |
| `client.wallets.remove(id)` | Удалить монитор | `Promise<void>` |
| `client.wallets.toggle(id)` | Включить/выключить мониторинг | `Promise<Wallet>` — кошелёк с новым статусом |

**Тело запросов:**

- `create(body: CreateWalletDTO)` — `{ address, networkUuid, tokenUuids, minAmount?, webhookUrl?, notifySettings? }`
- `update(id, body: UpdateWalletDTO)` — `{ tokenUuids?, minAmount?, webhookUrl?, notifySettings?, status? }`

```ts
const list = await client.wallets.list();
// [{ id, address, networkUuid, tokenUuids, status, ... }, ...]

const wallet = await client.wallets.create({
  address: '0x...',
  networkUuid: '...',
  tokenUuids: ['...'],
});
// { id: string, address: string, status: string, ... }
```

---

### Notifications

| Метод | Описание | Ответ |
|-------|----------|--------|
| `client.notifications.list(query?)` | Список уведомлений | `Promise<Notification[]>` (или объект с пагинацией — как возвращает API) |
| `client.notifications.get(id)` | Уведомление по ID | `Promise<Notification>` — один объект уведомления |

**Query:** `{ limit?, offset?, status?, channel?, networkSlug? }`

```ts
const list = await client.notifications.list({ limit: 20, offset: 0 });
const one = await client.notifications.get('<notification-id>');
// { id, networkSlug, transactionHash, status, channel, payload, createdAt, ... }
```

---

### Public (без авторизации)

| Метод | Описание | Ответ |
|-------|----------|--------|
| `client.public.getNetworks()` | Активные сети с токенами | `Promise<PublicNetworkDTO[]>` |

**Структура ответа `PublicNetworkDTO[]`:**

```ts
Array<{
  id: string;
  name: string;
  slug: string;
  tokens: Array<{
    id: string;
    name: string;
    slug: string;
    type: 'native' | 'token';
  }>;
}>
```

```ts
const networks = await client.public.getNetworks();
// [{ id, name, slug, tokens: [{ id, name, slug, type }] }, ...]
```

---

### Balance

| Метод | Описание | Ответ |
|-------|----------|--------|
| `client.balance.get()` | Текущий баланс кредитов | `Promise<{ balance: number }>` |
| `client.balance.getTransactions(query?)` | История транзакций по балансу | `Promise<{ transactions: Transaction[], total: number }>` (или как в API) |
| `client.balance.getTransaction(id)` | Транзакция по ID | `Promise<Transaction>` — одна запись |

**Query для list:** `{ limit?, offset?, type?, status? }`

```ts
const { balance } = await client.balance.get();
// { balance: number }

const history = await client.balance.getTransactions({ limit: 50, offset: 0 });
// { transactions: [...], total: number } или массив — по контракту API

const tx = await client.balance.getTransaction('<transaction-id>');
// { id, amount, type, status, balanceBefore, balanceAfter, createdAt, ... }
```

---

## Низкоуровневый доступ

```ts
const response = await client.request('GET', '/custom-endpoint', {
  query: { limit: 10 },
  body: { ... },
});
```

## Экспортируемые типы

Из пакета можно импортировать типы ответов и тел запросов:

- `BalanceResponse` — ответ `balance.get()`: `{ balance: number }`
- `PublicNetworkDTO`, `PublicTokenDTO` — ответ `public.getNetworks()`
- `CreateWalletDTO`, `UpdateWalletDTO` — тела запросов кошельков
- `MonitorTxsApiError`, `MonitorTxsNetworkError`, `MonitorTxsTimeoutError`
- `MonitorTxsClientOptions`, `RequestOptions`, `RetryOptions`
- `DEFAULT_BASE_URL`

## Совместимость

- Node.js 18+
- TypeScript 5+
