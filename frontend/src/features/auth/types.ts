/** Account, session, and login types shared across the auth feature. */

/** The two rendering surfaces an auth view knows about. */
export type AuthSurface = 'desktop' | 'mobile';

/** A learner is one of three roles; admin also carries Django staff rights. */
export type AuthRole = 'student' | 'instructor' | 'admin';

/** How an account signed in; mirrors the backend provider enum. */
export type AuthProviderId = 'password' | 'google' | 'facebook';

/** The auth card can create an account or sign into an existing one. */
export type AuthScreen = 'sign-in' | 'register';

/** The signed-in account payload every response returns. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AuthRole;
  isAdmin: boolean;
  membershipStatus: string;
  avatarInitials: string;
  avatarUrl: string;
  language: string;
  timezone: string;
  learningLevel: string;
  interests: string[];
  notifications: Record<string, boolean>;
  headline: string;
  credential: string;
  createdAt: string;
  lastSeenAt: string | null;
}

/** The Firebase web config the API hands the SPA — public, copied from the console. */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

/** Firebase client config + which providers the API accepts. */
export interface AuthConfig {
  firebase: FirebaseWebConfig;
  providers: AuthProviderId[];
  /** True when the API accepts `dev:<email>` tokens (local development). */
  devAuth: boolean;
}

/** What a successful sign-in returns. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** One device footprint row in the sessions list. */
export interface AuthSession {
  id: string;
  os: string;
  browser: string;
  deviceType: string;
  deviceLabel: string;
  ipAddress: string;
  isActive: boolean;
  isCurrent: boolean;
  revokedReason: string;
  createdAt: string;
  lastSeenAt: string;
}

/** Blank user; real values arrive from the API on login. */
export const EMPTY_AUTH_USER: AuthUser = {
  id: '',
  email: '',
  fullName: '',
  phone: '',
  role: 'student',
  isAdmin: false,
  membershipStatus: '',
  avatarInitials: '',
  avatarUrl: '',
  language: 'ar',
  timezone: '',
  learningLevel: 'intermediate',
  interests: [],
  notifications: {},
  headline: '',
  credential: '',
  createdAt: '',
  lastSeenAt: null,
};

/** Arabic labels for the role a reader can hold. */
export const ROLE_LABELS: Record<AuthRole, string> = {
  student: 'طالب',
  instructor: 'مدرّب',
  admin: 'مشرف',
};

/** Human labels for the device types the API reports. */
export const DEVICE_LABELS: Record<string, string> = {
  desktop: 'حاسوب',
  mobile: 'هاتف',
  tablet: 'جهاز لوحي',
  unknown: 'جهاز غير معروف',
};

/** Copy shown when a signed-in-elsewhere session is reported by the API. */
export const SESSION_LOST_MESSAGES: Record<string, string> = {
  signed_in_elsewhere: 'تم تسجيل الدخول من جهاز آخر، لذلك تم إنهاء هذه الجلسة.',
  session_invalid: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.',
  expired: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.',
  session_expired: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.',
  revoked: 'تم إنهاء هذه الجلسة من قِبَل الإدارة.',
};
