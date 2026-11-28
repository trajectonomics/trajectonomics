import {
	API_PATH,
	BASE_PATH,
	COLLECTORS_PATH,
	ME_PATH,
	SIGN_IN_PATH,
	SIGN_OUT_PATH,
	SITE_ORIGIN,
} from "../core/urls"

/** The one host every static site is served under: the apex. */
export { API_PATH, BASE_PATH, COLLECTORS_PATH, ME_PATH, SIGN_IN_PATH, SIGN_OUT_PATH, SITE_ORIGIN }

/** The overview page, the root of the data site. */
export const DATA_PATH = `${BASE_PATH}/`

/** The method page. */
export const METHOD_PATH = `${BASE_PATH}/method/`

/** The log page: the raw tokens-per-plan-and-model table and the daily chart. */
export const LOG_PATH = `${BASE_PATH}/log/`

/** The public path of a file the build emits at the root of the data site. */
export function assetPath(path: string): string {
	if (!path.startsWith("/")) {
		throw new Error(`assetPath: "${path}" is not an absolute path`)
	}
	return `${BASE_PATH}${path}`
}

/** The organisation's name, as the header and the footer write it. */
export const SITE_NAME = "Trajectonomics"

/** The Site Home at the root of the apex. */
export const SITE_HOME_URL = "/"

/** The Docs Portal, under the apex. */
export const DOCS_URL = "/docs/"

/** The monorepo that holds the data site's source. */
export const SOURCE_URL = "https://github.com/trajectonomics/trajectonomics"

/** The data app inside that monorepo. */
export const DATA_SOURCE_URL = `${SOURCE_URL}/tree/main/apps/data`

/** Where a reader reports a wrong fact. */
export const ISSUES_URL = `${SOURCE_URL}/issues`

/** The repository's licence. */
export const LICENCE_URL = `${SOURCE_URL}/blob/main/LICENSE`
