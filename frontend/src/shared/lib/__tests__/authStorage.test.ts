import { describe, expect, it } from 'vitest';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/lib/authStorage';

describe('authStorage', () => {
  it('reports no session on a fresh browser', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('stores and reads back both tokens', () => {
    setTokens('access-token', 'refresh-token');

    expect(getAccessToken()).toBe('access-token');
    expect(getRefreshToken()).toBe('refresh-token');
  });

  it('overwrites a previous session instead of merging with it', () => {
    setTokens('old-access', 'old-refresh');
    setTokens('new-access', 'new-refresh');

    expect(getAccessToken()).toBe('new-access');
    expect(getRefreshToken()).toBe('new-refresh');
  });

  it('forgets both tokens together, so a half-cleared session is impossible', () => {
    setTokens('access-token', 'refresh-token');
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
