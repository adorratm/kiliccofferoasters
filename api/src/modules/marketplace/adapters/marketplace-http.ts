import { BadRequestException, Logger } from '@nestjs/common';

export type MarketplaceHttpOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Debug etiket */
  label?: string;
};

export type MarketplaceHttpResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
  rawText: string;
};

const logger = new Logger('MarketplaceHttp');

export class MarketplaceHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'MarketplaceHttpError';
  }
}

export async function marketplaceFetch<T = unknown>(
  url: string,
  options: MarketplaceHttpOptions = {},
): Promise<MarketplaceHttpResult<T>> {
  const timeoutMs = options.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    let body: string | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body =
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let data: T = undefined as T;
    if (rawText) {
      try {
        data = JSON.parse(rawText) as T;
      } catch {
        data = rawText as unknown as T;
      }
    }

    if (!res.ok) {
      const asObj =
        typeof data === 'object' && data
          ? (data as unknown as Record<string, unknown>)
          : null;
      const msg =
        asObj && 'message' in asObj
          ? String(asObj.message)
          : `HTTP ${res.status}`;
      logger.warn(
        `${options.label || 'marketplace'} ${options.method || 'GET'} ${url} → ${res.status}: ${msg}`,
      );
      throw new MarketplaceHttpError(msg, res.status, data);
    }

    return { ok: true, status: res.status, data, rawText };
  } catch (err) {
    if (err instanceof MarketplaceHttpError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new MarketplaceHttpError('Pazaryeri API zaman aşımı', 408, null);
    }
    throw new MarketplaceHttpError(
      err instanceof Error ? err.message : String(err),
      0,
      null,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function basicAuthHeader(user: string, pass: string): string {
  const token = Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export function requireCreds(
  credentials: Record<string, string>,
  keys: string[],
  platform: string,
): Record<string, string> {
  const missing = keys.filter((k) => !credentials[k]?.trim());
  if (missing.length) {
    throw new BadRequestException(
      `${platform}: eksik credential alanları: ${missing.join(', ')}`,
    );
  }
  return credentials;
}

export function asMockNoCredentials(platform: string) {
  return {
    mock: true as const,
    stub: false as const,
    message: `${platform}: credentials yok — işlem simüle edildi`,
  };
}
