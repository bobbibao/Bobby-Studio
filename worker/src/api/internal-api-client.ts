import { ClaimResponse, WorkerEventAck, WorkerEventV1 } from '../contracts/generation.contracts';

/** The API refused the worker's credentials or request shape: retrying cannot help. */
export class ApiRejectedError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiRejectedError';
  }
}

/** The API could not be reached or failed transiently: the caller may retry the same request. */
export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export interface InternalApi {
  claim(jobId: string, signal?: AbortSignal): Promise<ClaimResponse>;
  sendEvent(jobId: string, event: WorkerEventV1, signal?: AbortSignal): Promise<WorkerEventAck>;
}

const REQUEST_TIMEOUT_MS = 10_000;

/** Service-authenticated client for the API's internal claim/event routes. */
export class HttpInternalApi implements InternalApi {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
  ) {}

  claim(jobId: string, signal?: AbortSignal): Promise<ClaimResponse> {
    return this.post<ClaimResponse>(`/internal/generations/${jobId}/claim`, {}, signal);
  }

  async sendEvent(jobId: string, event: WorkerEventV1, signal?: AbortSignal): Promise<WorkerEventAck> {
    const ack = await this.post<WorkerEventAck>(`/internal/generations/${jobId}/events`, event, signal);
    // A bare 2xx is not enough: completion requires an explicit acknowledgment from the API.
    if (ack?.acknowledged !== true) throw new ApiUnavailableError('The API response was not an acknowledgment');
    return ack;
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.secret}` },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ApiUnavailableError(`The API could not be reached: ${(error as Error).name}`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiRejectedError(response.status, 'The API rejected the worker credentials');
    }
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      throw new ApiUnavailableError(`The API answered HTTP ${response.status}`);
    }
    if (!response.ok) throw new ApiRejectedError(response.status, `The API rejected the request (HTTP ${response.status})`);
    return (await response.json()) as T;
  }
}
