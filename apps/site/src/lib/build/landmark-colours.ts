import type { DesignTokens, Theme } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"
import { colourOf, paintedColours } from "./roles"

/** The landmarks a visitor sees first: each paints the Theme's own background and text. */
const LANDMARK_TAGS = ["header", "main", "footer"] as const

/** The role a landmark paints a colour with, and the role of the Theme that colour must be. */
const PARTS = [
	{ painted: "background", role: "background" },
	{ painted: "foreground", role: "foreground" },
] as const

function landmarkFailures(
	path: string,
	page: ScannedPage,
	theme: Theme,
	tag: string,
	tokens: DesignTokens,
): readonly BuildFailure[] {
	const [landmark] = elementsByTag(page, tag)
	if (landmark === undefined) return []
	const painted = paintedColours([...landmark.ancestors, landmark], tokens.colourUtilities)
	return PARTS.flatMap((part) => {
		const role = painted[part.painted]
		const found = colourOf(theme, role)
		const wanted = theme.colours[part.role]
		if (found !== undefined && wanted !== undefined && found === wanted) return []
		return [
			buildFailure(
				"LANDMARK_COLOUR_NOT_WIRED",
				path,
				`<${tag}> paints its ${part.painted} with ${role === undefined ? "no role" : `the "${role}" role (${found ?? "no colour"})`}, but the ${theme.name} Theme's ${part.role} is ${wanted ?? "undefined"}.`,
			),
		]
	})
}

/** Each landmark paints the published Theme's own background and foreground, in every Theme. */
export function checkLandmarkColours(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const page = scanHtml(file.content)
		return tokens.themes.flatMap((theme) =>
			LANDMARK_TAGS.flatMap((tag) => landmarkFailures(file.path, page, theme, tag, tokens)),
		)
	})
}
