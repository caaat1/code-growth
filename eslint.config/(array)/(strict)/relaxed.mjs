import { eslintConfigBaseRelaxation } from '../../(object)/relaxation.mjs'
import { eslintConfigStrict } from '../strict.mjs'

// Resultant "relaxed" config: eslintConfigStrict with eslintConfigBaseRelaxation
// merged on top. See (object)/relaxation.mjs for which rules loosen and why.
export const eslintConfigRelaxed = [
  ...eslintConfigStrict,
  eslintConfigBaseRelaxation,
]
