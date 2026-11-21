import { DOCS_BASE_PATH } from "./tabs"

/** One file of the Docs Portal content tree: its path under `src/content/docs/` and its text. */
export interface ContentFile {
	readonly path: string
	readonly content: string
}

/** The content directory, relative to the repository root. */
export const CONTENT_ROOT = "src/content/docs"

/** Extensions Fumadocs reads as a page. */
export const PAGE_EXTENSIONS = [".mdx", ".md"] as const

/** Whether `path`, without an extension, names a page file. */
export function hasPage(files: readonly ContentFile[], path: string): boolean {
	return PAGE_EXTENSIONS.some((extension) =>
		files.some((file) => file.path === `${path}${extension}`),
	)
}

/** Whether `folder` has the landing page Fumadocs takes as the folder's own page. */
export function hasLandingPage(files: readonly ContentFile[], folder: string): boolean {
	return hasPage(files, `${folder}/index`)
}

/** The page entries a folder's `meta.json` lists, with separators, exclusions and links left out. */
export function navigationEntries(
	files: readonly ContentFile[],
	folder: string,
): readonly string[] {
	const path = folder === "" ? "meta.json" : `${folder}/meta.json`
	const meta = files.find((file) => file.path === path)
	if (meta === undefined) {
		return []
	}
	const parsed: unknown = JSON.parse(meta.content)
	const pages =
		typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)["pages"]
			: undefined
	if (!Array.isArray(pages)) {
		return []
	}
	return pages.filter(
		(entry): entry is string =>
			typeof entry === "string" &&
			!entry.startsWith("!") &&
			!entry.startsWith("[") &&
			!entry.startsWith("---") &&
			entry !== "..." &&
			entry !== "z...a",
	)
}

/** Whether `path`, without an extension, names a page or a folder that has a landing page. */
export function resolvesPagePath(files: readonly ContentFile[], path: string): boolean {
	return hasPage(files, path) || hasLandingPage(files, path)
}

/** Whether a `meta.json` page entry names a page or a folder that has one. */
export function resolvesNavigationEntry(
	files: readonly ContentFile[],
	folder: string,
	entry: string,
): boolean {
	return resolvesPagePath(files, folder === "" ? entry : `${folder}/${entry}`)
}

/** A markdown link to a site path on this host; `!` makes it an image. */
const MARKDOWN_LINK = /(!?)\]\((\/(?!\/)[^)\s]*)\)/g

/** An `href` attribute pointing at a site path on this host. */
const ATTRIBUTE_LINK = /href="(\/(?!\/)[^"]*)"/g

/** Every site-absolute link in `content`, markdown or JSX, in source order. */
export function internalLinks(content: string): readonly string[] {
	const links: string[] = []
	for (const match of content.matchAll(MARKDOWN_LINK)) {
		const [, image, link] = match
		if (image !== "!" && link !== undefined) {
			links.push(link)
		}
	}
	for (const match of content.matchAll(ATTRIBUTE_LINK)) {
		const link = match[1]
		if (link !== undefined) {
			links.push(link)
		}
	}
	return links
}

/** The content path a portal URL names, with the base, trailing slashes, fragment and query gone. */
export function contentPathOf(url: string): string {
	const path = (url.split(/[?#]/)[0] ?? "").replace(/\/+$/, "")
	const withoutBase =
		DOCS_BASE_PATH.length > 0 && (path === DOCS_BASE_PATH || path.startsWith(`${DOCS_BASE_PATH}/`))
			? path.slice(DOCS_BASE_PATH.length)
			: path
	return withoutBase.replace(/^\//, "")
}
