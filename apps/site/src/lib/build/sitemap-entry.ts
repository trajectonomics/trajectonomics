import { hreflangTarget } from "./hreflang-target"
import { elementsByTag, type HtmlElement, scanHtml, textOf } from "./html"

/** One `<url>` of a Sitemap: the path its `<loc>` names, that `<loc>`, and the alternates it holds. */
export interface SitemapEntry {
	/** The path the entry's `<loc>` names, or `undefined` when it names none a crawler could follow. */
	readonly path: string | undefined
	/** The `<loc>`'s text exactly as the build wrote it. */
	readonly loc: string
	/** The `<xhtml:link>` elements inside this `<url>`, in document order. */
	readonly alternates: readonly HtmlElement[]
}

/** Every `<url>` of a Sitemap in document order, each with its `<loc>` and the alternates it holds. */
export function sitemapEntries(content: string): readonly SitemapEntry[] {
	// The hand-rolled reader already skips `<?xml ?>`, reads `xhtml:link` as a tag and takes `/>` as
	// standalone, so no XML parser joins the tree for the same reason ADR 0004 hand-rolled the HTML one.
	const page = scanHtml(content)
	const locs = elementsByTag(page, "loc")
	const alternates = elementsByTag(page, "xhtml:link")
	return Object.freeze(
		elementsByTag(page, "url").map((url) => {
			const loc = locs.find((element) => element.ancestors.includes(url))
			const text = loc === undefined ? "" : textOf(page, loc)
			return Object.freeze({
				path: hreflangTarget(text)?.path,
				loc: text,
				alternates: Object.freeze(alternates.filter((link) => link.ancestors.includes(url))),
			})
		}),
	)
}
