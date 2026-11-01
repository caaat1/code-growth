import { eslintConfigBase } from '../(object)/base.mjs'
import { eslintConfigBrowserScript } from '../(object)/browserScript.mjs'
import { eslintConfigIgnores } from '../(object)/ignores.mjs'
import { eslintConfigJavascript } from '../(object)/javascript.mjs'
import {
  eslintConfigSelf,
  eslintConfigSelfTypeAware,
} from '../(object)/self.mjs'
import { eslintConfigTest } from '../(object)/test.mjs'

export const eslintConfigStrict = [
  // Must stay first and ignores-only — see ignores.mjs's own header for why.
  eslintConfigIgnores,
  // Lints eslint.config.mjs and the eslint.config/ tree itself — see
  // self.mjs's own header for why it's split into two config objects.
  eslintConfigSelf,
  eslintConfigSelfTypeAware,
  eslintConfigBase,
  eslintConfigJavascript,
  eslintConfigBrowserScript,
  eslintConfigTest,
]
