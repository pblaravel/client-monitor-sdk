export class MonitorTxsApiError extends Error {
  readonly status: number;
  readonly data?: unknown;
  readonly requestId?: string | null;

  constructor(message: string, status: number, data?: unknown, requestId?: string | null) {
    super(message);
    this.name = 'MonitorTxsApiError';
    this.status = status;
    this.data = data;
    this.requestId = requestId ?? null;
  }
}

export class MonitorTxsNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorTxsNetworkError';
  }
}

export class MonitorTxsTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorTxsTimeoutError';
  }
}

export class MonitorTxsWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorTxsWebhookError';
  }
}
