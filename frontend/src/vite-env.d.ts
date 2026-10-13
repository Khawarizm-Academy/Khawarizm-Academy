/// <reference types="vite/client" />

// Env contract: set the API base URL in .env.development or .env.production.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
