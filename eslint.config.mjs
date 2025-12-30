import { FlatCompat } from '@eslint/eslintrc'
 
const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})
 
const eslintConfig = [
  ...compat.config({
    extends: ['next'],
    plugins: ['import'],
  }),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      // Swiggy Dec 2025 pattern: Enable critical rules in development to catch bugs early
      // Only disable in production if absolutely necessary
      '@typescript-eslint/no-unused-vars': process.env.NODE_ENV === 'production' ? 'off' : 'warn',
      '@typescript-eslint/no-explicit-any': process.env.NODE_ENV === 'production' ? 'off' : 'warn',
      // CRITICAL: Enable exhaustive-deps to prevent infinite loops
      'react-hooks/exhaustive-deps': process.env.NODE_ENV === 'production' ? 'off' : 'warn',
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/no-useless-path-segments': 'error',
    },
  },
]
 
export default eslintConfig