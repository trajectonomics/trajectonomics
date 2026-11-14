import { contrastRatio, parseRgb } from "../design/colour"
import type { DesignTokens, Theme } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { type ScannedPage, scanHtml, type TextRun } from "./html"
import { minimumContrast } from "./minimum-contrast"
import { colourOf, type PaintedColours, paintedColours } from "./roles"
import { type TypeScale, typeScaleOf } from "./type-scale"

/** The text of a run, as a failure line shows it: whitespace collapsed, a long run cut short. */
function excerpt(text: string): string {
	const collapsed = text.replace(/\s+/g, " ").trim()
	return collapsed.length <= 40 ? collapsed : `${collapsed.slice(0, 37)}...`
}

/** A run whose background or text role no published Theme resolves to a colour. */
function unresolved(
	path: string,
	run: TextRun,
	theme: Theme,
	painted: PaintedColours,
): BuildFailure {
	return buildFailure(
		"TEXT_COLOUR_UNRESOLVED",
		path,
		`"${excerpt(run.text)}" paints background ${painted.background ?? "none"} and text ${painted.foreground ?? "none"} in the ${theme.name} Theme, which the published Theme does not resolve to a colour.`,
	)
}

function contrastFailures(
	path: string,
	run: TextRun,
	theme: Theme,
	tokens: DesignTokens,
	scale: TypeScale,
): readonly BuildFailure[] {
	const painted = paintedColours(run.ancestors, tokens.colourUtilities)
	const background = colourOf(theme, painted.background)
	const foreground = colourOf(theme, painted.foreground)
	if (background === undefined || foreground === undefined) {
		return [unresolved(path, run, theme, painted)]
	}
	const a = parseRgb(background)
	const b = parseRgb(foreground)
	if (a === undefined || b === undefined) {
		return [
			buildFailure(
				"TEXT_COLOUR_UNREADABLE",
				path,
				`"${excerpt(run.text)}" paints ${foreground} on ${background} in the ${theme.name} Theme, a value this check cannot turn into a contrast ratio.`,
			),
		]
	}
	const required = minimumContrast(run.ancestors, scale)
	const ratio = contrastRatio(b, a)
	if (ratio >= required) return []
	return [
		buildFailure(
			"TEXT_CONTRAST_TOO_LOW",
			path,
			`"${excerpt(run.text)}" reads at ${ratio.toFixed(2)}:1 in the ${theme.name} Theme, under the ${required}:1 WCAG AA requires for it.`,
		),
	]
}

/** Every text run on every built page meets WCAG AA against its background, in every Theme. */
export function checkTextContrast(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	const scale = typeScaleOf(files)
	return builtPages(files).flatMap((file) => {
		const page: ScannedPage = scanHtml(file.content)
		return tokens.themes.flatMap((theme) =>
			page.text.flatMap((run) => contrastFailures(file.path, run, theme, tokens, scale)),
		)
	})
}
