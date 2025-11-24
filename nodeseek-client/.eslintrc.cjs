module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.main.json', './tsconfig.preload.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:import/recommended', 'plugin:import/typescript', 'prettier'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_'
      }
    ]
  },
  ignorePatterns: ['dist', 'release', 'node_modules']
};
