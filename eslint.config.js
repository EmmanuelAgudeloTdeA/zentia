import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const API_LAYERS = 'domain|application|infrastructure|presentation';
const WEB_FOLDERS = 'components|hooks|services|store|types';

export default defineConfig(
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/coverage/**', 'docs/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/**/*.ts'],
    ignores: ['apps/api/src/modules/*/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(\\.\\./)+(?!(${API_LAYERS})/)[^./][^/]*/(${API_LAYERS})(/|$)`,
              message: 'Importa otros módulos solo desde su barril (index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@prisma/client', 'express'],
          patterns: [
            {
              group: ['**/infrastructure/**', '**/presentation/**'],
              message: 'application no depende de infrastructure ni de presentation.',
            },
            {
              regex: `^(\\.\\./)+(?!(${API_LAYERS})/)[^./][^/]*/(${API_LAYERS})(/|$)`,
              message: 'Importa otros módulos solo desde su barril (index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
              message: 'domain no depende de capas externas.',
            },
            {
              regex: '^(?!\\.|@zentia/shared$)',
              message: 'domain solo importa archivos propios y @zentia/shared.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(\\.\\./)+(?!(${WEB_FOLDERS})/)[^./][^/]*/(${WEB_FOLDERS})(/|$)`,
              message: 'Importa otras features solo desde su barril (index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/http-client', '**/core/http-client/**'],
              message: 'Los componentes llaman a la API mediante services.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@prisma/client', 'express', 'react'],
          patterns: [{ group: ['**/apps/**'], message: 'shared no depende de las apps.' }],
        },
      ],
    },
  },
  {
    files: ['packages/shared/src/calc/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='parseFloat']", message: 'Usa decimal.js.' },
        { selector: "CallExpression[callee.name='parseInt']", message: 'Usa decimal.js.' },
        { selector: "CallExpression[callee.name='Number']", message: 'Usa decimal.js.' },
        { selector: "UnaryExpression[operator='+']", message: 'Usa decimal.js.' },
        {
          selector: "MemberExpression[object.name='Math'][property.name='round']",
          message: 'Usa Decimal con ROUND_HALF_UP.',
        },
      ],
    },
  },
);
