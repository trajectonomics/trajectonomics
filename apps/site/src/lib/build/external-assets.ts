import { isAbsoluteUrl } from "./absolute-url"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, relTokens, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The `as` kinds a forbidden preload loads: a script or a style, the kinds the rule names. */
const RESOURCE_AS = new Set(["script", "style"])

/** Whether a link loads a script or a stylesheet the rule judges. */
function loadsAsset(link: HtmlElement): boolean {
	const rel = relTokens(link)
	const as = (link.attributes["as"] ?? "").toLowerCase()
	return (
		rel.includes("stylesheet") ||
		rel.includes("modulepreload") ||
		(rel.includes("preload") && RESOURCE_AS.has(as))
	)
}

/** The URLs of the scripts and stylesheets a built page loads, as its elements name them. */
function pageAssetUrls(html: string): readonly string[] {
	const page = scanHtml(html)
	return [
		...elementsByTag(page, "script").flatMap((script) =>
			script.attributes["src"] === undefined ? [] : [script.attributes["src"]],
		),
		...elementsByTag(page, "link").flatMap((link) => {
			const href = link.attributes["href"]
			return loadsAsset(link) && href !== undefined ? [href] : []
		}),
	]
}

/** No built page loads a script or stylesheet from an absolute URL. */
export function checkExternalAssets(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files
		.filter((file) => file.path.endsWith(".html"))
		.flatMap((file) =>
			pageAssetUrls(file.content)
				.filter(isAbsoluteUrl)
				.map((url) =>
					buildFailure(
						"EXTERNAL_ASSET",
						pageUrl(file.path),
						`loads ${url} from an absolute URL; the Site loads only its own root-relative assets.`,
					),
				),
		)
}
