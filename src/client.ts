import { MonitorTxsApiError, MonitorTxsNetworkError, MonitorTxsTimeoutError } from './errors';
import {
  DEFAULT_BASE_URL,
  type AddPoolWalletDTO,
  type ApiPrefix,
  type BalanceResponse,
  type BalanceTransaction,
  type BalanceTransactionListResponse,
  type Contract,
  type CreateContractDTO,
  type CreatePaymentDTO,
  type CreateWalletDTO,
  type HttpMethod,
  type MonitorTxsClientOptions,
  type NotificationListQuery,
  type NotificationListResponse,
  type NotificationRecord,
  type NotificationTxRawResponse,
  type PackCreditDTO,
  type Payment,
  type PoolWallet,
  type Profile,
  type PublicNetworkDTO,
  type QueryParamValue,
  type QueryParams,
  type RequestOptions,
  type RetryOptions,
  type UpdateContractDTO,
  type UpdateWalletDTO,
  type Wallet,
} from './types';

export class MonitorTxsClient {
  private baseUrl: string;
  private authToken: string | null;
  private getAuthToken?: () => string | null | Promise<string | null>;
  private fetchFn: typeof fetch;
  private timeoutMs: number;
  private defaultHeaders: Record<string, string>;
  private retry: Partial<RetryOptions>;
  private apiPrefix: ApiPrefix;

  constructor(options: MonitorTxsClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.authToken = options.apiKey ?? options.authToken ?? null;
    this.getAuthToken = options.getAuthToken;
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.retry = options.retry ?? {};
    this.apiPrefix = options.apiPrefix ?? 'auto';
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setApiKey(apiKey: string | null) {
    this.authToken = apiKey;
  }

  async request<TResponse = unknown, TBody = unknown>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const retryOptions = resolveRetryOptions(this.retry, options.retry);
    const shouldRetry = retryOptions.retries > 0;
    const execute = () => this.executeRequest<TResponse, TBody>(method, path, options);

    if (!shouldRetry) {
      return execute();
    }

    return retryWithBackoff(execute, retryOptions, method);
  }

  readonly profile = {
    get: () => this.request<Profile>('GET', '/me'),
  };

  readonly wallets = {
    list: () => this.request<Wallet[]>('GET', '/wallets', { versioned: true }),
    create: (body: CreateWalletDTO) =>
      this.request<Wallet, CreateWalletDTO>('POST', '/wallets', { body, versioned: true }),
    update: (id: string, body: UpdateWalletDTO) =>
      this.request<Wallet, UpdateWalletDTO>('PATCH', `/wallets/${id}`, { body, versioned: true }),
    remove: (id: string) => this.request<void>('DELETE', `/wallets/${id}`, { versioned: true }),
    toggle: (id: string) => this.request<Wallet>('POST', `/wallets/${id}/toggle`, { versioned: true }),
  };

  readonly contracts = {
    list: () => this.request<Contract[]>('GET', '/contracts'),
    create: (body: CreateContractDTO) =>
      this.request<Contract, CreateContractDTO>('POST', '/contracts', { body }),
    update: (id: string, body: UpdateContractDTO) =>
      this.request<Contract, UpdateContractDTO>('PATCH', `/contracts/${id}`, { body }),
    remove: (id: string) => this.request<void>('DELETE', `/contracts/${id}`),
    toggle: (id: string) => this.request<Contract>('POST', `/contracts/${id}/toggle`),
    validate: <TResult = unknown>(body: Pick<CreateContractDTO, 'networkUuid' | 'address'>) =>
      this.request<TResult>('POST', '/contracts/validate', { body }),
  };

  readonly notifications = {
    list: (query?: NotificationListQuery) =>
      this.request<NotificationListResponse>('GET', '/notifications', { query, versioned: true }),
    get: (id: string) =>
      this.request<NotificationRecord>('GET', `/notifications/${id}`, { versioned: true }),
    getTxRaw: (id: string) =>
      this.request<NotificationTxRawResponse>('GET', `/notifications/${id}/tx-raw`, { versioned: true }),
  };

  readonly public = {
    getNetworks: () =>
      this.request<PublicNetworkDTO[]>('GET', '/public/networks', { auth: false }),
    getPackCredits: () =>
      this.request<PackCreditDTO[]>('GET', '/public/pack-credits', { auth: false }),
  };

  readonly balance = {
    get: () => this.request<BalanceResponse>('GET', '/balance'),
    getTransactions: (query?: { limit?: number; offset?: number; type?: string; status?: string }) =>
      this.request<BalanceTransactionListResponse>('GET', '/balance/transactions', { query }),
    getTransaction: (id: string) =>
      this.request<BalanceTransaction>('GET', `/balance/transactions/${id}`),
  };

  readonly paymentPages = {
    addPoolWallet: (body: AddPoolWalletDTO) =>
      this.request<PoolWallet, AddPoolWalletDTO>('POST', '/v1/payment-pages/pool-wallets', { body }),
    createPayment: (body: CreatePaymentDTO) =>
      this.request<Payment, CreatePaymentDTO>('POST', '/v1/payment-pages/payments', { body }),
  };

  private async executeRequest<TResponse, TBody>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<TBody>
  ): Promise<TResponse> {
    const resolvedPath = await this.resolvePath(path, options);
    const url = buildUrl(this.baseUrl, resolvedPath, options.query);
    const { signal, cleanup } = createAbortController(options.signal, options.timeoutMs ?? this.timeoutMs);
    const headers = await this.buildHeaders(options);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : serializeBody(options.body, headers),
        signal,
      });

      if (!response.ok) {
        const data = await safeParseBody(response);
        const message = extractErrorMessage(data, response.statusText);
        throw new MonitorTxsApiError(message, response.status, data, readRequestId(response));
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      const data = await safeParseBody(response);
      return data as TResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw new MonitorTxsTimeoutError('Request aborted due to timeout');
      }
      if (error instanceof MonitorTxsApiError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new MonitorTxsNetworkError('Network error. Please check your connection.');
      }
      if (error instanceof Error && error.message.toLowerCase().includes('fetch')) {
        throw new MonitorTxsNetworkError('Network error. Please check your connection.');
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  private async resolvePath<TBody>(path: string, options: RequestOptions<TBody>): Promise<string> {
    if (!options.versioned) {
      return path;
    }

    const prefix = await this.resolveApiPrefix(options.auth);
    if (!prefix) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return normalized;
    }
    return `${prefix}${normalized}`;
  }

  private async resolveApiPrefix(auth?: RequestOptions['auth']): Promise<string> {
    if (this.apiPrefix !== 'auto') {
      return this.apiPrefix;
    }

    const token = await this.resolveAuthToken(auth);
    return token?.startsWith('api_key_') ? '/v1' : '';
  }

  private async buildHeaders<TBody>(options: RequestOptions<TBody>): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    };

    const authToken = await this.resolveAuthToken(options.auth);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (options.body !== undefined && shouldSetJsonContentType(options.body, headers)) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private async resolveAuthToken(auth?: { token?: string | null } | false): Promise<string | null> {
    if (auth === false) {
      return null;
    }

    if (auth?.token !== undefined) {
      return auth.token ?? null;
    }

    if (this.getAuthToken) {
      return (await this.getAuthToken()) ?? null;
    }

    return this.authToken ?? null;
  }
}

const DEFAULT_RETRY: RetryOptions = {
  retries: 0,
  delayMs: 300,
  factor: 2,
  maxDelayMs: 2000,
  retryOn: [408, 429, 500, 502, 503, 504],
  methods: ['GET', 'HEAD'],
};

const RETRYABLE_METHODS = new Set<HttpMethod>(['GET', 'HEAD']);

const resolveRetryOptions = (
  base?: Partial<RetryOptions>,
  override?: Partial<RetryOptions>
): RetryOptions => {
  return { ...DEFAULT_RETRY, ...base, ...override };
};

const retryWithBackoff = async <T>(
  action: () => Promise<T>,
  options: RetryOptions,
  method: HttpMethod
): Promise<T> => {
  if (!isMethodRetryable(method, options)) {
    return action();
  }

  let attempt = 0;
  let delay = options.delayMs;
  const factor = options.factor ?? 2;

  while (true) {
    try {
      return await action();
    } catch (error) {
      if (!shouldRetryError(error, options)) {
        throw error;
      }

      if (attempt >= options.retries) {
        throw error;
      }

      await sleep(delay);
      attempt += 1;
      delay = Math.min(options.maxDelayMs ?? delay * factor, delay * factor);
    }
  }
};

const shouldRetryError = (error: unknown, options: RetryOptions): boolean => {
  if (error instanceof MonitorTxsApiError) {
    return options.retryOn?.includes(error.status) ?? false;
  }
  if (error instanceof MonitorTxsNetworkError || error instanceof MonitorTxsTimeoutError) {
    return true;
  }
  return false;
};

const isMethodRetryable = (method: HttpMethod, options: RetryOptions): boolean => {
  if (options.methods && options.methods.length > 0) {
    return options.methods.includes(method);
  }
  return RETRYABLE_METHODS.has(method);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const buildUrl = (baseUrl: string, path: string, query?: QueryParams) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => appendQueryParam(params, key, item));
      } else {
        appendQueryParam(params, key, value);
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url.search = queryString;
    }
  }

  return url.toString();
};

const appendQueryParam = (params: URLSearchParams, key: string, value: QueryParamValue) => {
  if (value === undefined || value === null) {
    return;
  }
  params.append(key, String(value));
};

const safeParseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text || undefined;
};

const extractErrorMessage = (data: unknown, fallback: string): string => {
  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  const maybeError = (data as { error?: unknown }).error;
  if (typeof maybeError === 'string' && maybeError.trim().length > 0) {
    return maybeError;
  }

  return fallback;
};

const serializeBody = (body: unknown, headers: HeadersInit) => {
  if (isFormData(body) || isUrlSearchParams(body) || typeof body === 'string') {
    return body as BodyInit;
  }

  if (headers instanceof Headers && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return JSON.stringify(body);
};

const shouldSetJsonContentType = (body: unknown, headers: Record<string, string>) => {
  if (headers['Content-Type']) {
    return false;
  }
  return !isFormData(body) && !isUrlSearchParams(body) && typeof body !== 'string';
};

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

const isUrlSearchParams = (value: unknown): value is URLSearchParams =>
  typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams;

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === 'AbortError';

const readRequestId = (response: Response): string | null =>
  response.headers.get('x-request-id') ?? response.headers.get('x-correlation-id');

const createAbortController = (signal?: AbortSignal, timeoutMs?: number) => {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};
