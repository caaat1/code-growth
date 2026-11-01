import { join } from 'node:path'

import { findProjectRootDir } from '../project/root/dir/find.js'

/** Where this package keeps the page it copies into a project. */
export const pageDir = join(findProjectRootDir(import.meta.dirname), 'page')
