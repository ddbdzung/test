/* @ts-ignore */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
  includeIgnoreFile(gitignorePath),
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  { ...jestPlugin.configs['flat/recommended'] },
  {
    plugins: {
      import: importPlugin,
      security: securityPlugin,
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@/core', './src/core'],
            ['@/configs', './src/configs'],
            ['@/constants', './src/core/constants'],
            ['@/framework', './src/framework'],
            ['@/modules', './src/modules'],
          ],
          extensions: ['.js', '.mjs', '.json'],
        },
        node: {
          paths: ['src'],
          extensions: ['.js', '.mjs'],
        },
      },
    },
    rules: {
      // Basic rules
      'no-undef': 'error',
      'no-async-promise-executor': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      'import/no-unresolved': 'error',
      'import/no-unused-modules': 'warn',
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',

      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
    },
  },
];
