/**
 * Real Firebase sign-in for the browsers that have a Firebase project.
 *
 * The SDK is imported lazily so local runs (which fall back to `dev:<email>`
 * tokens) never download it. Every path resolves to a Firebase ID token that
 * `/api/auth/firebase` then verifies and links to our User table.
 */

import type { AuthConfig, AuthProviderId, AuthScreen } from '@/features/auth/types';

/** Everything a credential sign-in needs from the form. */
export interface Credentials {
  screen: AuthScreen;
  email: string;
  password: string;
  fullName?: string;
}

let cachedAuth: import('firebase/auth').Auth | null = null;

/** Seconds the popup may take to settle; a stalled connection to the auth host never settles on its own. */
const POPUP_SETTLE_MS = 90_000;

/** The `{code}` shaped error the login card translates through its message map. */
function codeError(code: string): Error {
  const err = new Error(code);
  (err as { code?: string }).code = code;
  return err;
}

/** Initialize (once) and return the Firebase auth instance. */
async function client(config: AuthConfig) {
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const app = getApps().length ? getApp() : initializeApp(config.firebase);
  cachedAuth ??= getAuth(app);
  return cachedAuth;
}

/** The matching Firebase provider for a social id, `null` for password. */
async function socialProvider(provider: Exclude<AuthProviderId, 'password'>) {
  const { GoogleAuthProvider, FacebookAuthProvider } = await import('firebase/auth');
  return provider === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
}

/**
 * Run the real Firebase flow and return the ID token for the API.
 * `credentials` is required for `password` and ignored for social sign-in.
 */
export async function firebaseIdToken(
  config: AuthConfig,
  provider: AuthProviderId,
  credentials?: Credentials
): Promise<string> {
  const auth = await client(config);

  if (provider === 'password') {
    if (!credentials) throw new Error('[auth] password sign-in needs credentials.');
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const result =
      credentials.screen === 'register'
        ? await createUserWithEmailAndPassword(auth, credentials.email, credentials.password)
        : await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    if (credentials.screen === 'register' && credentials.fullName) {
      await updateProfile(result.user, { displayName: credentials.fullName });
    }
    return result.user.getIdToken();
  }

  const { signInWithPopup } = await import('firebase/auth');
  // A popup that cannot reach the auth host hangs forever — race it against the settle deadline.
  let settle = 0;
  const deadline = new Promise<never>((_, reject) => {
    settle = window.setTimeout(() => reject(codeError('auth/network-request-failed')), POPUP_SETTLE_MS);
  });
  try {
    const result = await Promise.race([
      signInWithPopup(auth, await socialProvider(provider)),
      deadline,
    ]);
    return result.user.getIdToken();
  } finally {
    window.clearTimeout(settle);
  }
}
