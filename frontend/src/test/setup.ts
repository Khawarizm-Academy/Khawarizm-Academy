import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * React Testing Library only auto-cleans when Vitest runs with globals on,
 * which this project keeps off so every test import stays explicit for `tsc`.
 * The DOM and the token storage are reset before each test so cases never
 * leak a session into one another.
 */
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});
