const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  requestAnimationFrame: 'readonly',
  HTMLCanvasElement: 'readonly',
  URL: 'readonly',
  __APP_VERSION__: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'constructor-super': 'error',
      'eqeqeq': ['error', 'always'],
      'no-const-assign': 'error',
      'no-debugger': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-imports': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**/*.js', 'e2e/**/*.js', '*.config.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        process: 'readonly',
      },
    },
  },
];
