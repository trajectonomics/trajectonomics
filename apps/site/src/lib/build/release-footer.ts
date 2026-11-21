import type { Dictionary } from "../language/dictionary"
import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"

/** The footer's `<time>`, the element that carries the release day as text and as a machine date. */
function releaseTime(page: ScannedPage, footer: HtmlElement): HtmlElement | undefined {
	return elementsByTag(page, "time").find((element) => element.ancestors.includes(footer))
}

/** The footer names its Dictionary's release line and release day, and the snapshot's own machine date. */
export function footerFailures(file: BuiltFile, dictionary: Dictionary): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const footer = elementsByTag(page, "footer")[0]
	if (footer === undefined) return []
	const failures: BuildFailure[] = []
	if (!textOf(page, footer).includes(dictionary.releaseLine)) {
		failures.push(
			buildFailure(
				"RELEASE_LINE_NOT_NAMED",
				file.path,
				`the footer does not print "${dictionary.releaseLine}".`,
			),
		)
	}
	const time = releaseTime(page, footer)
	const shown = time === undefined ? "" : textOf(page, time)
	if (shown !== dictionary.releaseDate) {
		failures.push(
			buildFailure(
				"RELEASE_DATE_TEXT_NOT_NAMED",
				file.path,
				`the footer's <time> shows "${shown}" instead of "${dictionary.releaseDate}".`,
			),
		)
	}
	const machine = time?.attributes["datetime"] ?? ""
	if (machine !== RELEASE_SNAPSHOT.releasedOn) {
		failures.push(
			buildFailure(
				"RELEASE_DATE_MISMATCH",
				file.path,
				`the footer's <time> datetime is "${machine}" instead of "${RELEASE_SNAPSHOT.releasedOn}".`,
			),
		)
	}
	return failures
}
