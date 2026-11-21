import { DOCS_BASE_PATH } from "../tabs"

/** The URL path of the Build on Trajectonomics section, retired in phase 3b. */
const RETIRED_SECTION = `${DOCS_BASE_PATH}/developers`

/** The `tax-core` pages of the retired section, which now live in the tax guide. */
const RETIRED_TAX_CORE = `${RETIRED_SECTION}/tax-core`

/** Where the tax guide lives. */
export const TAX_GUIDE_PATH = `${DOCS_BASE_PATH}/contribute/tax/`

/** Where the Contribute Tab lives, which takes every other retired page. */
export const CONTRIBUTE_TAB_PATH = `${DOCS_BASE_PATH}/contribute/`

/** Whether `pathname` is `base` itself or a path under it, with or without a trailing slash. */
function isUnder(pathname: string, base: string): boolean {
	return pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * The page a retired `/docs/developers` path now answers with a 301, or `null` when the path is not
 * retired. `tax-core` pages go to the tax guide; every other path in the section goes to the Contribute Tab.
 */
export function retiredPathTarget(pathname: string): string | null {
	if (isUnder(pathname, RETIRED_TAX_CORE)) return TAX_GUIDE_PATH
	if (isUnder(pathname, RETIRED_SECTION)) return CONTRIBUTE_TAB_PATH
	return null
}
