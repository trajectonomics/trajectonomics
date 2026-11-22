import { OG_TYPE, pageShare, SITE_NAME, TWITTER_CARD } from "../head-tags"
import { PORTAL_PURPOSE } from "../portal"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { tagAttribute } from "./html"
import { readerPages } from "./reader-pages"

/** The head of a built page, where its canonical link and share meta belong. */
const HEAD = /<head\b[^>]*>([\s\S]*?)<\/head>/i

/** The `<title>` text of a built page, as Astro wrote it (escaped the same way the layout's value is). */
const TITLE = /<title>([\s\S]*?)<\/title>/i

/** A `<meta>` or `<link>` start tag of a built page. */
const HEAD_TAG = /<(meta|link)\b([^>]*)>/gi

/**
 * The head's `<meta>` and `<link>` values by key: `og:title` for a `property` or `name`, `canonical`
 * for a `rel`. Astro escapes a value the same way in every place it writes one, so the built text is
 * compared as written.
 */
function tagEntry(match: RegExpMatchArray): readonly [string, string] | undefined {
	const attributes = match[2] ?? ""
	if (match[1]?.toLowerCase() === "link") {
		const rel = tagAttribute(attributes, "rel")
		const href = tagAttribute(attributes, "href")
		return rel === undefined || href === undefined ? undefined : [rel, href]
	}
	const key = tagAttribute(attributes, "property") ?? tagAttribute(attributes, "name")
	const content = tagAttribute(attributes, "content")
	return key === undefined || content === undefined ? undefined : [key, content]
}

function headValues(head: string): ReadonlyMap<string, string> {
	const entries = [...head.matchAll(HEAD_TAG)].flatMap((match) => {
		const entry = tagEntry(match)
		return entry === undefined ? [] : [entry]
	})
	return new Map(entries)
}

/** One value a page's head must state, and the rule that reports it when wrong. */
interface Expected {
	readonly key: string
	readonly value: string
}

function expectedValues(path: string, html: string): readonly Expected[] {
	const head = HEAD.exec(html)?.[1] ?? ""
	const title = TITLE.exec(head)?.[1] ?? ""
	const described = headValues(head).get("description")
	const share = pageShare(path, title, described ?? PORTAL_PURPOSE)
	return [
		{ key: "canonical", value: share.url },
		{ key: "og:title", value: share.title },
		{ key: "og:description", value: share.description },
		{ key: "og:url", value: share.url },
		{ key: "og:type", value: OG_TYPE },
		{ key: "og:site_name", value: SITE_NAME },
		{ key: "og:image", value: share.image },
		{ key: "twitter:card", value: TWITTER_CARD },
		{ key: "twitter:image", value: share.image },
	]
}

/**
 * The page's built head carries the canonical link and the Open Graph and X card the layout states,
 * each with the value the page's own URL, title and description give it.
 */
function headFailures(file: BuiltFile, path: string): readonly BuildFailure[] {
	const head = HEAD.exec(file.content)?.[1] ?? ""
	const values = headValues(head)
	return expectedValues(path, file.content).flatMap(({ key, value }) => {
		const actual = values.get(key)
		if (actual === undefined) {
			return [buildFailure("HEAD_TAG_MISSING", file.path, `the head has no ${key}`)]
		}
		if (actual !== value) {
			return [
				buildFailure(
					"HEAD_TAG_MISMATCH",
					file.path,
					`the head's ${key} is ${actual}, not ${value}`,
				),
			]
		}
		return []
	})
}

/**
 * Failures for a reader page whose head lacks the canonical link or an Open Graph or X tag, or states
 * one with the wrong value. The 404 page is no reader page and carries none of them.
 */
export function checkHeadTags(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return readerPages(files).flatMap(({ file, url }) => headFailures(file, url))
}
