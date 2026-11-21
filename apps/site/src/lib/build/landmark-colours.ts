import type { DesignTokens, Theme } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"
import { colourOf, paintedColours } from "./roles"

/** The landmarks a visitor sees first: each paints a published surface, and the text on it. */
const LANDMARK_TAGS = ["header", "main", "footer"] as const

/** A surface role a landmark may paint, and the text role that belongs on that surface. */
const SURFACES = [
	{ surface: "background", text: "foreground" },
	{ surface: "muted", text: "foreground" },
	{ surface: "stage", text: "stage-foreground" },
] as const

/** The surfaces a landmark may paint, named for a failure message. */
const SURFACE_NAMES = SURFACES.map((candidate) => candidate.surface).join(", ")

/** A role the Theme resolves, or the words for one it does not. */
function describe(role: string | undefined, colour: string | undefined): string {
	return role === undefined ? "no role" : `the "${role}" role (${colour ?? "no colour"})`
}

/** A landmark paints one published surface, and the text role that belongs on it, in every Theme. */
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
	const surface = painted.background
	const surfaceColour = colourOf(theme, surface)
	const wanted = SURFACES.find((candidate) => candidate.surface === surface)
	if (wanted === undefined || surfaceColour === undefined) {
		return [
			buildFailure(
				"LANDMARK_COLOUR_NOT_WIRED",
				path,
				`<${tag}> paints its background with ${describe(surface, surfaceColour)}, which is not one of the ${theme.name} Theme's surfaces: ${SURFACE_NAMES}.`,
			),
		]
	}
	const textColour = colourOf(theme, painted.foreground)
	if (painted.foreground === wanted.text && textColour !== undefined) return []
	return [
		buildFailure(
			"LANDMARK_TEXT_ROLE_MISMATCH",
			path,
			`<${tag}> paints its text with ${describe(painted.foreground, textColour)}, but its "${wanted.surface}" surface carries "${wanted.text}" in the ${theme.name} Theme.`,
		),
	]
}

/** Each landmark paints a published Theme surface and the text role that surface carries. */
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
