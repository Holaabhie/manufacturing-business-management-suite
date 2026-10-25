import nextConfig from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.pw-browsers/**',
      '**/scratch/**',
      '**/tally-spike-output/**',
      '**/test-results/**',
      '**/public/**',
      '**/next-env.d.ts',
      '**/android/**',
    ],
  },
  ...nextConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'import/no-unresolved': 'warn',
      'import/named': 'warn',
      'import/default': 'warn',
      'import/namespace': 'warn',
      'import/no-absolute-path': 'warn',
      'import/no-dynamic-require': 'warn',
      'import/no-self-import': 'warn',
      'import/no-cycle': 'off',
      'import/no-useless-path-segments': 'warn',
    },
  },
  {
    files: [
      'src/lib/auth-session.ts',
      'src/lib/permissions.ts',
      'src/lib/mongodb.ts',
      'src/lib/tenant-filter.ts',
      'src/shared/middleware/with-auth.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

export default eslintConfig;