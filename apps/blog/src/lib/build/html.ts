/** The attributes of one start tag, by lower-cased name. */
export type Attributes = ReadonlyMap<string, string>

const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g

/** Every start tag of one element in a page, as its attributes. */
export function tags(html: string, element: string): readonly Attributes[] {
	const pattern = new RegExp(`<${element}\\b([^>]*)>`, "gi")
	return [...html.matchAll(pattern)].map((match) => {
		const attributes = new Map<string, string>()
		for (const [, name, value] of (match[1] ?? "").matchAll(ATTRIBUTE)) {
			if (name !== undefined && value !== undefined) attributes.set(name.toLowerCase(), value)
		}
		return attributes
	})
}

/** The page's `<title>` text, or `undefined` when it has none or it is blank. */
export function titleOf(html: string): string | undefined {
	const text = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim()
	return text === undefined || text === "" ? undefined : text
}

/** The page's canonical URL, or `undefined` when it names none. */
export function canonicalOf(html: string): string | undefined {
	const link = tags(html, "link").find((attributes) => attributes.get("rel") === "canonical")
	const href = link?.get("href")?.trim()
	return href === undefined || href === "" ? undefined : href
}

/** Whether the page asks search engines not to index it, as the Not-found Page does. */
export function isNoindex(html: string): boolean {
	return tags(html, "meta").some(
		(attributes) =>
			attributes.get("name") === "robots" && /\bnoindex\b/.test(attributes.get("content") ?? ""),
	)
}

/** Every link target in the page. */
export function linkTargets(html: string): readonly string[] {
	return tags(html, "a").flatMap((attributes) => attributes.get("href") ?? [])
}

/** Every image in the page, as its source and its alternative text (`undefined` when it has none). */
export function images(html: string): readonly { src: string; alt: string | undefined }[] {
	return tags(html, "img").map((attributes) => ({
		src: attributes.get("src") ?? "",
		alt: attributes.get("alt"),
	}))
}

/** Whether the page is a Post, which the build marks with an Open Graph type of `article`. */
export function isArticle(html: string): boolean {
	return tags(html, "meta").some(
		(attributes) =>
			attributes.get("property") === "og:type" && attributes.get("content") === "article",
	)
}

/** The `@type` of every JSON-LD node the page states, from each block's top level and its `@graph`. */
export function jsonLdTypes(html: string): readonly string[] {
	const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
	return blocks.flatMap((match) => {
		let parsed: unknown
		try {
			parsed = JSON.parse(match[1] ?? "")
		} catch {
			return []
		}
		const nodes = Array.isArray(parsed) ? parsed : [parsed]
		return nodes.flatMap((node) => {
			const type = (node as { "@type"?: unknown } | null)?.["@type"]
			return typeof type === "string" ? [type] : []
		})
	})
}

/** The page's `hreflang` alternates, as each Language and its href. */
export function alternatesOf(html: string): readonly { hreflang: string; href: string }[] {
	return tags(html, "link")
		.filter((attributes) => attributes.get("rel") === "alternate" && attributes.has("hreflang"))
		.map((attributes) => ({
			hreflang: attributes.get("hreflang") ?? "",
			href: attributes.get("href") ?? "",
		}))
}
