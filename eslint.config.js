import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(antfu(
  {
    unocss: true,
    formatters: true,
  },
  {
    rules: {
      // Allow trailing space in comments, for possible JSDoc formattings
      'no-trailing-spaces': ['error', { ignoreComments: true }],
      // Relaxes inline statements a bit
      'max-statements-per-line': ['error', { max: 2 }],
    },
  },
  // Allow trailing space for markdown formatting
  {
    files: ['**/*.md'],
    rules: {
      'no-trailing-spaces': 'off',
    },
  },
))
