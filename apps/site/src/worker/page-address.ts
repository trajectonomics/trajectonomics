import type { Language } from "../lib/language/language"
import { CLEAN_URL, LANGUAGES, languageHomePath, spokenLanguage } from "../lib/language/languages"
import { openJotAssetPath } from "../lib/language/openjot-dictionary"
import { languageChoiceCookie } from "../lib/language/stored-choice"
import { OPENJOT_PATH } from "../lib/site/openjot"

/** One address the Worker answers itself, and the built file it fetches for each Language. */
export interface PageAddress {
	readonly address: string
	readonly assetPath: (language: Language) => string
}

/** The pages the Worker answers; every other path is a static asset (ADR 0020, ADR 0032). */
export const PAGE_ADDRESSES: readonly PageAddress[] = Object.freeze([
	Object.freeze({ address: CLEAN_URL, assetPath: languageHomePath }),
	Object.freeze({ address: OPENJOT_PATH, assetPath: openJotAssetPath }),
])

/** The prefixes the Site answered at before it had one address: one per Language the Site speaks. */
const OLD_PREFIXES: readonly string[] = Object.freeze(
	LANGUAGES.map((entry) => `/${entry.language}`),
)

/** The status an old prefix, or an address without its slash, answers with. */
const MOVED_STATUS = 301

/** The status the Language choice answers with: back to the address, with the choice stored. */
const CHOICE_STATUS = 302

/** The choice answer is a redirect that stores state, so no cache may keep it. */
const CHOICE_CACHE_CONTROL = "no-store"

/** The page one path is, or `undefined` when the assets layer serves it. */
export function pageAt(pathname: string): PageAddress | undefined {
	return PAGE_ADDRESSES.find((page) => page.address === pathname)
}

/** Whether a path is one the Site answered at before it had one address. */
export function isOldAddress(pathname: string): boolean {
	return OLD_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** The 301 every old prefix answers, so an indexed URL never 404s. */
export function movedToAddress(): Response {
	return new Response(null, { status: MOVED_STATUS, headers: { Location: CLEAN_URL } })
}

/** The OpenJot address without its slash reaches the address the Worker answers. */
export function trailingSlashResponse(url: URL): Response {
	return new Response(null, {
		status: MOVED_STATUS,
		headers: { Location: `${OPENJOT_PATH}${url.search}` },
	})
}

/** The Language choice answer: store a Language the Site speaks, then return to the page it was asked on. */
export function choiceResponse(address: string, choice: string | null): Response {
	const language = spokenLanguage(choice)
	const headers = new Headers({ Location: address, "Cache-Control": CHOICE_CACHE_CONTROL })
	if (language !== undefined) headers.set("Set-Cookie", languageChoiceCookie(language))
	return new Response(null, { status: CHOICE_STATUS, headers })
}
