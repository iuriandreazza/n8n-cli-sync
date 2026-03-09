import axios from 'axios';

/**
 * Extracts a human-readable error message from any thrown value.
 * For Axios errors, includes the HTTP status and the response body so
 * the caller can see the actual API error (e.g. n8n validation details).
 */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const statusText = err.response?.statusText ?? '';
    const data = err.response?.data;

    let detail = '';
    if (data) {
      if (typeof data === 'string') {
        detail = data.trim();
      } else if (typeof data === 'object') {
        // n8n typically returns { message: string } or { message: string, code: string }
        const body = data as Record<string, unknown>;
        const parts: string[] = [];
        if (body['message']) parts.push(String(body['message']));
        if (body['code']) parts.push(`code=${body['code']}`);
        if (body['error']) parts.push(String(body['error']));
        if (parts.length === 0) {
          // Fallback: serialize the whole body (trimmed to 300 chars)
          const raw = JSON.stringify(data);
          parts.push(raw.length > 300 ? raw.slice(0, 300) + '…' : raw);
        }
        detail = parts.join(' | ');
      }
    }

    const statusLabel = status
      ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}`
      : err.message;
    return detail ? `${statusLabel} — ${detail}` : statusLabel;
  }

  return err instanceof Error ? err.message : String(err);
}
