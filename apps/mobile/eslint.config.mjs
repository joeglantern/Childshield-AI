// Mobile lint: the shared workspace base plus accessibility rules.
//
// eslint-plugin-react-native-a11y (MIT) catches by machine the mistakes the
// manual audit found by hand: touchables without a role, roles without a
// name, elements that convey state visually but not programmatically. These
// run in CI so the accessibility work stays done.
import base from '@childshield/config/eslint.base.mjs';
import a11y from 'eslint-plugin-react-native-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['app/**/*.tsx', 'src/**/*.tsx'],
    plugins: { 'react-native-a11y': a11y },
    rules: {
      // A touchable must carry a role AND a name. This is the rule that
      // would have caught the ~25 unnamed buttons found by hand.
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-value': 'error',
      'react-native-a11y/has-valid-accessibility-actions': 'error',
      'react-native-a11y/no-nested-touchables': 'error',
      // Hints are genuinely optional — required only where a control's
      // effect is not obvious from its label.
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/has-valid-accessibility-ignores-invert-colors': 'off',
    },
  },
  {
    // Metro resolves static assets through require(); there is no ESM
    // equivalent it understands, so the registries legitimately use it.
    files: ['src/assets.ts', 'src/sounds.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', 'assets/**', 'public/**', 'dist-*/**'],
  },
];
