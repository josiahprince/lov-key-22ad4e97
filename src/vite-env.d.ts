/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Dev-only location fallback for browsers that won't share location; see src/lib/location.ts.
  readonly VITE_DEV_IP_LOCATION?: string;
}
