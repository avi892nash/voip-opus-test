// Flat config — required by ESLint 9+ (we're on v10 since the eslint group
// bump in dependabot #32). Direct replacement for the old .eslintrc.cjs;
// behaviour is preserved exactly:
//
//   - same ignored paths (`dist`, plus the public AudioWorklet which isn't
//     part of the TS bundle and trips no-undef on AudioWorkletProcessor)
//   - same parser (@typescript-eslint/parser) for .ts/.tsx
//   - same extends set (eslint:recommended, @typescript-eslint/recommended,
//     plugin:react-hooks/recommended), translated to flat-config equivalents
//   - same two custom rules (react-refresh/only-export-components,
//     @typescript-eslint/no-unused-vars allowing _-prefixed args)
//
// react-hooks v7's `recommended` config silently expanded to include the
// React Compiler ruleset (purity, immutability, set-state-in-render, etc).
// We opt back into the v4-era subset (rules-of-hooks + exhaustive-deps)
// here so this dep bump stays a no-op for the source tree; opting into the
// compiler rules is a separate decision.

import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  // The old .eslintrc.cjs got away with linting only `*.{ts,tsx}` via the
  // CLI's `--ext` flag, so the vendored worker bundle under public/ was
  // never linted. Flat config doesn't have `--ext`; we replace the implicit
  // skip with an explicit one here. Nothing under public/ is hand-written
  // TS — it's static assets and pre-minified bundles (opus-recorder's
  // encoderWorker.min.js, the AudioWorklet processor, icons, manifest).
  { ignores: ['dist', 'public'] },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript already enforces "is this name in scope" via its own
      // checker, and it knows about DOM lib types (RTCPeerConnection,
      // MediaTrackConstraints, the new-JSX-transform `React`, …) which
      // ESLint's no-undef doesn't. Disabling no-undef on TS files is the
      // upstream recommendation:
      // https://typescript-eslint.io/troubleshooting/faqs/general/#i-get-errors-from-the-no-undef-rule
      'no-undef': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
]
