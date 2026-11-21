import { INSTALL_PROMPT } from "../site"
import type { BuiltFile } from "./built-files"
import { copyFailures } from "./copy-control"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** The attribute that marks a Language home's install window, so these rules judge the window alone. */
const WINDOW = "data-install-window"

/** Every `code` element the window carries, in document order: the prompt, and anything else set as code. */
function codesInWindow(page: ScannedPage, window: HtmlElement): readonly HtmlElement[] {
	return elementsByTag(page, "code").filter((code) => code.ancestors.includes(window))
}

/** A home whose window shows nothing set as code: the prompt is missing, or only a script carries it. */
function missingPrompt(file: BuiltFile): BuildFailure {
	return buildFailure(
		"PAGE_PROMPT_MISSING",
		file.path,
		"the install window shows no prompt, so a visitor with JavaScript off has nothing to read.",
	)
}

/** The first `code` whose text is not the fixture, with the text it does show and the text it should. */
function textFailures(
	file: BuiltFile,
	page: ScannedPage,
	shown: readonly HtmlElement[],
): readonly BuildFailure[] {
	const other = shown.find((code) => textOf(page, code) !== INSTALL_PROMPT)
	if (other === undefined) return []
	return [
		buildFailure(
			"PROMPT_TEXT_MISMATCH",
			file.path,
			`the install window shows "${textOf(page, other)}" instead of "${INSTALL_PROMPT}".`,
		),
	]
}

/** The window carries one `code` and no second: a second one is a second `code` in the window. */
function secondCodeFailures(file: BuiltFile, count: number): readonly BuildFailure[] {
	if (count <= 1) return []
	return [
		buildFailure(
			"INSTALL_WINDOW_EXTRA_CODE",
			file.path,
			`the install window carries ${count} code elements; it shows one prompt and nothing else.`,
		),
	]
}

/**
 * The install window shows the prompt: one `code` element carrying the fixture's text, and no second
 * `code` beside it.
 *
 * The rule is window-scoped because the page prints product copy — `traj`, `$ traj plan` — outside the
 * window on purpose. It is a tripwire, not a proof: a different command added elsewhere on the page
 * passes, because no pure, network-free check can ban "a command" on a page that prints one on purpose.
 */
export function checkInstallWindow(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const page = scanHtml(file.content)
		const window = page.elements.find((element) => WINDOW in element.attributes)
		const codes = window === undefined ? [] : codesInWindow(page, window)
		const shown = codes.filter((code) => textOf(page, code) !== "")
		const first = shown[0]
		if (first === undefined) return [missingPrompt(file)]
		return [
			...textFailures(file, page, shown),
			...secondCodeFailures(file, codes.length),
			...copyFailures(file.path, page, entry.dictionary, first),
		]
	})
}
