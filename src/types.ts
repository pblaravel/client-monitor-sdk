export const DEFAULT_BASE_URL = 'https://api.chain-monitor.online';

/** Header that carries the HMAC-SHA256 hex digest of the raw webhook body. */
export const WEBHOOK_SIGNATURE_HEADER = 'X-Webhook-Signature';

export type WalletStatus = 'active' | 'paused' | (string & {});

export type TokenType = 'native' | 'token' | (string & {});

export type NetworkType = 'evm' | 'tron' | 'solana' | 'sui' | (string & {});

/**
 * Per-wallet delivery flags.
 *
 * New wallets default to `onConfirmed: true` and `onDetected: false`.
 * At least one of `onDetected` / `onConfirmed` must be true.
 * Enabling both sends two alerts per transfer (2 credits).
 */
export type NotifySettings = {
  telegram?: boolean;
  webhook?: boolean;
  notifyIncoming?: boolean;
  notifyOutgoing?: boolean;
  /** Fire `transaction_detected` when the transfer is first seen in a block. */
  onDetected?: boolean;
  /** Fire `transaction_confirmed` after the network confirmation depth. */
  onConfirmed?: boolean;
};

export type CreateWalletDTO = {
  address: string;
  networkUuid: string;
  tokenUuids: string[];
  minAmount?: string;
  webhookUrl?: string;
  notifySettings?: NotifySettings;
};

export type UpdateWalletDTO = {
  tokenUuids?: string[];
  minAmount?: string;
  webhookUrl?: string;
  notifySettings?: NotifySettings;
  status?: WalletStatus;
};

export type PublicTokenDTO = {
  id: string;
  name: string;
  slug: string;
  type: TokenType;
};

export type PublicNetworkDTO = {
  id: string;
  name: string;
  slug: string;
  /** Present on GET /public/networks (e.g. `evm`, `tron`, `solana`, `sui`). */
  type?: NetworkType;
  tokens: PublicTokenDTO[];
};

export type Wallet = {
  id: string;
  address: string;
  networkUuid: string;
  tokenUuids: string[];
  minAmount?: string;
  webhookUrl?: string | null;
  status: WalletStatus;
  notifySettings?: NotifySettings;
  network?: unknown;
  tokens?: PublicTokenDTO[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateContractDTO = {
  networkUuid: string;
  address: string;
  minAmount?: string;
  webhookUrl?: string;
  notifySettings?: NotifySettings;
};

export type UpdateContractDTO = {
  minAmount?: string;
  webhookUrl?: string;
  notifySettings?: NotifySettings;
  status?: WalletStatus;
};

export type Contract = {
  id: string;
  address: string;
  networkUuid: string;
  minAmount?: string;
  webhookUrl?: string | null;
  status?: WalletStatus;
  notifySettings?: NotifySettings;
  network?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type PackCreditDTO = {
  id: string;
  popular: boolean;
  count: string;
  price: string | number;
  discount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type BalanceResponse = {
  balance: number;
};

export type BalanceTransaction = {
  id: string;
  amount?: number | string;
  type?: string;
  status?: string;
  balanceBefore?: number | string;
  balanceAfter?: number | string;
  createdAt?: string;
  [key: string]: unknown;
};

export type BalanceTransactionListResponse = {
  transactions: BalanceTransaction[];
  total: number;
};

export type WebhookEventType = 'transaction_confirmed' | 'transaction_detected';

export type TransferDirection = 'in' | 'out' | (string & {});

export type WebhookTransactionData = {
  txHash: string;
  network: string;
  blockNumber?: number;
  direction: TransferDirection;
  asset: string;
  /** Contract of the transferred coin, or `null` for a native coin. */
  contractAddress?: string | null;
  amount: string;
  from: string;
  to: string;
  timestamp: string;
  confirmations?: number;
  requiredConfirmations?: number;
  txHashLink?: string;
  fromLink?: string;
  toLink?: string;
};

export type WebhookPayload = {
  eventType: WebhookEventType;
  userId: string;
  correlationId?: string;
  timestamp: string;
  data: WebhookTransactionData;
};

export type NotificationRecord = {
  id: string;
  userId?: string;
  walletId?: string;
  channel?: string;
  eventType?: WebhookEventType | string;
  status?: string;
  transactionHash?: string;
  networkSlug?: string;
  payload?: unknown;
  createdAt?: string;
  [key: string]: unknown;
};

export type NotificationListQuery = {
  /** 1–100, default 25 on the API. */
  limit?: number;
  offset?: number;
  status?: string;
  channel?: string;
  networkSlug?: string;
};

export type NotificationListResponse = {
  notifications: NotificationRecord[];
  total: number;
};

export type NotificationTxRawResponse = {
  notificationId: string;
  transactionHash: string;
  networkSlug: string;
  data: {
    transaction?: unknown;
    receipt?: unknown;
    [key: string]: unknown;
  };
};

export type AddPoolWalletDTO = {
  paymentPageUuid: string;
  wallet: string;
  networkUuid: string;
};

export type PoolWallet = {
  uuid: string;
  wallet: string;
  paymentPageUuid: string;
  status: string;
  networkUuid: string;
  network?: Pick<PublicNetworkDTO, 'id' | 'name' | 'slug'>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePaymentDTO = {
  paymentPageUuid: string;
  networkUuid: string;
  tokenUuid: string;
  amount: string;
  webHookUrl?: string;
  dataOrder?: Record<string, unknown>;
};

export type Payment = {
  uuid: string;
  webHookUrl?: string | null;
  status: string;
  wallet: string;
  networkUuid: string;
  tokenUuid: string;
  amount: string;
  dataOrder?: Record<string, unknown> | null;
  dataTx?: unknown;
  paymentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Profile = {
  id: string;
  email?: string;
  name?: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD';

export type RetryOptions = {
  retries: number;
  delayMs: number;
  factor?: number;
  maxDelayMs?: number;
  retryOn?: number[];
  methods?: HttpMethod[];
};

/**
 * Path prefix for API-key resources (`/wallets`, `/notifications`).
 * `'auto'` uses `/v1` when the token starts with `api_key_`, otherwise the
 * unversioned dashboard-JWT routes.
 */
export type ApiPrefix = 'auto' | '/v1' | '';

export type RequestOptions<TBody = unknown> = {
  query?: QueryParams;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  retry?: Partial<RetryOptions>;
  auth?: { token?: string | null } | false;
  /** Prepend the resolved API prefix (`/v1` for API keys). */
  versioned?: boolean;
};

export type MonitorTxsClientOptions = {
  baseUrl?: string;
  /** API key from Dashboard → API (`api_key_…`). Preferred over `authToken`. */
  apiKey?: string | null;
  /** Dashboard JWT or API key. Kept for backward compatibility. */
  authToken?: string | null;
  getAuthToken?: () => string | null | Promise<string | null>;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  retry?: Partial<RetryOptions>;
  apiPrefix?: ApiPrefix;
};
