import eslint from '@eslint/js'
import tsESLint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'

export default tsESLint.config(eslint.configs.recommended, tsESLint.configs.recommended, {
  plugins: {
    prettier: prettierPlugin,
  },
  rules: {
    camelcase: 'error',
    'no-cond-assign': 'error',
    'no-console': 'error',
    'no-inner-declarations': 'error',
    'no-lonely-if': 'error',
    'no-shadow-restricted-names': 'error',
    'no-unused-expressions': 'error',
    'no-unused-vars': 'off',
    'no-useless-return': 'error',
    'no-var': 'error',
    'no-throw-literal': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-promise-reject-errors': 'error',
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
})
