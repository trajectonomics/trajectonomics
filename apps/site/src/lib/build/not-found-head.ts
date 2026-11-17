import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, isDataBlockType, relTokens, type ScannedPage, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The `property` prefixes and the `name` prefix a Social card's metas carry. */
const CARD_KEYS = [/^og:/, /^twitter:/]

/** Whether one meta belongs to a Social card, by the attribute that names it. */
function isCardMeta(attributes: Readonly<Record<string, string>>): boolean {
	const property = attributes["property"]
	const name = attributes["name"]
	return (
		(property !== undefined && CARD_KEYS.some((prefix) => prefix.test(property))) ||
		(name !== undefined && CARD_KEYS.some((prefix) => prefix.test(name)))
	)
}

/** The claims a miss makes none of: a description, a Social card and Structured data are a home's. */
function claimFailures(path: string, page: ScannedPage): readonly BuildFailure[] {
	const metas = elementsByTag(page, "meta")
	const failures: BuildFailure[] = []
	if (metas.some((meta) => meta.attributes["name"]?.toLowerCase() === "description")) {
		failures.push(
			buildFailure(
				"NOT_FOUND_HAS_DESCRIPTION",
				path,
				"describes itself, but a miss is not a page.",
			),
		)
	}
	if (elementsByTag(page, "script").some((script) => isDataBlockType(script.attributes["type"]))) {
		failures.push(
			buildFailure(
				"NOT_FOUND_HAS_JSON_LD",
				path,
				"carries Structured data, but a miss is not a WebSite.",
			),
		)
	}
	if (metas.some((meta) => isCardMeta(meta.attributes))) {
		failures.push(
			buildFailure(
				"NOT_FOUND_HAS_SOCIAL_CARD",
				path,
				"carries a Social card, but a miss is shared as nothing.",
			),
		)
	}
	return failures
}

/** The advertised links a miss carries none of, because it is not a Language home. */
function linkFailures(path: string, page: ScannedPage): readonly BuildFailure[] {
	const links = elementsByTag(page, "link")
	const failures: BuildFailure[] = []
	if (links.some((link) => relTokens(link).includes("canonical"))) {
		failures.push(buildFailure("NOT_FOUND_HAS_CANONICAL", path, "advertises a canonical URL."))
	}
	if (links.some((link) => link.attributes["hreflang"] !== undefined)) {
		failures.push(
			buildFailure("NOT_FOUND_HAS_HREFLANG", path, "advertises itself as a Language home."),
		)
	}
	if (elementsByTag(page, "a").some((anchor) => anchor.attributes["aria-current"] === "page")) {
		failures.push(
			buildFailure(
				"NOT_FOUND_HAS_CURRENT",
				path,
				"marks a link as the current page, but a miss is not its Language home.",
			),
		)
	}
	return failures
}

/** A Not-found page asks not to be indexed, and advertises nothing a home advertises. */
export function checkNotFoundHead(file: BuiltFile): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const path = pageUrl(file.path)
	const robots = elementsByTag(page, "meta").find(
		(meta) => meta.attributes["name"]?.toLowerCase() === "robots",
	)
	const failures: BuildFailure[] = []
	if (!/\bnoindex\b/i.test(robots?.attributes["content"] ?? "")) {
		failures.push(
			buildFailure("NOINDEX_MISSING", path, "is not marked noindex, so a crawler indexes it."),
		)
	}
	return [...failures, ...linkFailures(path, page), ...claimFailures(path, page)]
}
