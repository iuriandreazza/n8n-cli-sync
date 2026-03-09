import axios from 'axios';
import { extractErrorMessage } from '../src/error-utils';

jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {
    ...actual,
    isAxiosError: actual.isAxiosError,
  };
});

function makeAxiosError(
  status: number,
  statusText: string,
  data?: unknown,
): ReturnType<typeof axios.create> {
  const err = new Error('Request failed') as Error & {
    isAxiosError: boolean;
    response: { status: number; statusText: string; data: unknown };
  };
  err.isAxiosError = true;
  (err as unknown as { response: unknown }).response = { status, statusText, data };
  // Make axios.isAxiosError recognise this object
  Object.defineProperty(err, 'isAxiosError', { value: true });
  return err as unknown as ReturnType<typeof axios.create>;
}

describe('extractErrorMessage', () => {
  it('returns the error message for a plain Error', () => {
    expect(extractErrorMessage(new Error('something went wrong'))).toBe('something went wrong');
  });

  it('converts a non-Error primitive to string', () => {
    expect(extractErrorMessage('oops')).toBe('oops');
    expect(extractErrorMessage(42)).toBe('42');
  });

  it('formats an Axios error with status and message body', () => {
    const err = makeAxiosError(422, 'Unprocessable Entity', { message: 'Workflow invalid' });
    const result = extractErrorMessage(err);
    expect(result).toBe('HTTP 422 Unprocessable Entity — Workflow invalid');
  });

  it('includes code when present in response body', () => {
    const err = makeAxiosError(400, 'Bad Request', { message: 'Bad input', code: 'INVALID' });
    const result = extractErrorMessage(err);
    expect(result).toBe('HTTP 400 Bad Request — Bad input | code=INVALID');
  });

  it('includes error field from response body', () => {
    const err = makeAxiosError(500, 'Internal Server Error', { error: 'Server down' });
    const result = extractErrorMessage(err);
    expect(result).toBe('HTTP 500 Internal Server Error — Server down');
  });

  it('serialises unknown object response body', () => {
    const err = makeAxiosError(500, '', { unexpected: true });
    const result = extractErrorMessage(err);
    expect(result).toContain('HTTP 500');
    expect(result).toContain('unexpected');
  });

  it('handles string response body', () => {
    const err = makeAxiosError(403, 'Forbidden', 'Access denied');
    const result = extractErrorMessage(err);
    expect(result).toBe('HTTP 403 Forbidden — Access denied');
  });

  it('handles Axios error without response', () => {
    const err = new Error('Network Error') as Error & { isAxiosError: boolean };
    err.isAxiosError = true;
    Object.defineProperty(err, 'isAxiosError', { value: true });
    const result = extractErrorMessage(err);
    expect(result).toBe('Network Error');
  });

  it('truncates response body longer than 300 characters', () => {
    const longString = 'a'.repeat(400);
    const err = makeAxiosError(500, '', { data: longString });
    const result = extractErrorMessage(err);
    // Result should contain truncation indicator
    expect(result).toContain('…');
  });
});
