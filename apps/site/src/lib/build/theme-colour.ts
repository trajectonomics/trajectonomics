import { type ThemePaint, themePaints } from "../design/theme-paint"
import type { DesignTokens } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The meta a page paints the browser's chrome with. */
const BAR_META = "theme-color"

/** Every theme-color meta on a page, in document order. */
function paintsOf(page: ScannedPage): readonly HtmlElement[] {
	return elementsByTag(page, "meta").filter(
		(meta) => meta.attributes["name"]?.toLowerCase() === BAR_META,
	)
}

/** The media queries the published Themes state, for a message that names what the page owes. */
function statedMedia(paints: readonly ThemePaint[]): string {
	return paints.map((paint) => `"${paint.media}"`).join(" or ")
}

/** Every paint that follows no device scheme, which leaves the meta unreadable to a browser. */
function unattributed(
	path: string,
	metas: readonly HtmlElement[],
	paints: readonly ThemePaint[],
): readonly BuildFailure[] {
	const media = paints.map((paint) => paint.media)
	return metas.flatMap((meta) => {
		const written = meta.attributes["media"] ?? ""
		if (media.includes(written)) return []
		return [
			buildFailure(
				"THEME_COLOUR_MEDIA_WRONG",
				path,
				`carries a theme-color under media "${written}", not ${statedMedia(paints)}.`,
			),
		]
	})
}

/** One Theme's paint is present once, at the colour that Theme publishes. */
function checkPaint(
	path: string,
	metas: readonly HtmlElement[],
	paint: ThemePaint,
): readonly BuildFailure[] {
	const matching = metas.filter((meta) => meta.attributes["media"] === paint.media)
	const [meta] = matching
	if (meta === undefined) {
		return [
			buildFailure(
				"THEME_COLOUR_MISSING",
				path,
				`carries no theme-color for the ${paint.theme} Theme, so the browser bar takes its own colour.`,
			),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"THEME_COLOUR_DUPLICATE",
				path,
				`carries ${matching.length} theme-color paints for the ${paint.theme} Theme, not one.`,
			),
		]
	}
	const colour = meta.attributes["content"] ?? ""
	if (colour === paint.colour) return []
	return [
		buildFailure(
			"THEME_COLOUR_NOT_PUBLISHED",
			path,
			`paints the ${paint.theme} Theme's bar "${colour}", not the published "${paint.colour}".`,
		),
	]
}

/** Every built page paints the browser's bar with each published Theme's background, once. */
export function checkThemeColour(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	const paints = themePaints(tokens)
	return builtPages(files).flatMap((file) => {
		const path = pageUrl(file.path)
		const metas = paintsOf(scanHtml(file.content))
		return [
			...unattributed(path, metas, paints),
			...paints.flatMap((paint) => checkPaint(path, metas, paint)),
		]
	})
}
