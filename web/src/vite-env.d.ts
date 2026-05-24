/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_TURN_URL?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Compile-time constant injected by `define` in vite.config.ts.
// Source: web/package.json `version` field (kept in sync with the root
// package.json by semantic-release on every release).
declare const __APP_VERSION__: string;
