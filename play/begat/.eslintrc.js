export default {
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    // Best practices
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'no-var': 'error',
    'prefer-const': 'warn',

    // Style (compatible with Prettier)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 4, { SwitchCase: 1 }],
    'comma-dangle': ['error', 'only-multiline'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',

    // ES6+
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'prefer-template': 'warn',
  },
  globals: {
    // Browser globals
    html2canvas: 'readonly',
    // Test globals
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    vi: 'readonly',
    cy: 'readonly',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
  ],
};
