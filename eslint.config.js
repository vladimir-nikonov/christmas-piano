// Lint catches what a split into modules easily breaks: a missing import (no-undef),
// writing to another module's variable (no-import-assign) and leftovers (no-unused-vars).
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  // Test code passed to page.evaluate() runs in the browser, hence window/document below.
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.browser },
    rules: { 'no-undef': 'error', 'no-import-assign': 'error', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-redeclare': 'error' },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, window: 'readonly', document: 'readonly' } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] },
  },
];
