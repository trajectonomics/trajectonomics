import type { Dictionary } from "../language/dictionary"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, textOf } from "./html"

/** Neither copy message may live only in the script: the button carries both, for its Language. */
function messageFailures(
	path: string,
	button: HtmlElement,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const wanted = [
		{ attribute: "data-copied", value: dictionary.copied },
		{ attribute: "data-copy-failed", value: dictionary.copyFailed },
	]
	const missing = wanted.filter((message) => button.attributes[message.attribute] !== message.value)
	if (missing.length === 0) return []
	const names = missing.map((message) => `${message.attribute}="${message.value}"`).join(" and ")
	return [buildFailure("COPY_MESSAGES_MISSING", path, `the Copy button carries no ${names}.`)]
}

/** The Copy button sits beside the command, shows its label, and carries both messages. */
export function copyFailures(
	path: string,
	page: ScannedPage,
	dictionary: Dictionary,
	command: HtmlElement,
): readonly BuildFailure[] {
	const button = elementsByTag(page, "button")[0]
	if (button === undefined) {
		return [buildFailure("COPY_BUTTON_MISSING", path, "the hero has no Copy button.")]
	}
	const failures: BuildFailure[] = [...messageFailures(path, button, dictionary)]
	if (textOf(page, button) !== dictionary.copy) {
		failures.push(
			buildFailure(
				"COPY_BUTTON_LABEL_MISMATCH",
				path,
				`the Copy button shows "${textOf(page, button)}" instead of "${dictionary.copy}".`,
			),
		)
	}
	if (button.ancestors.at(-1) !== command.ancestors.at(-1)) {
		failures.push(
			buildFailure(
				"COPY_BUTTON_NOT_SIBLING",
				path,
				"the Copy button is not a sibling of the command, so it wraps it or sits elsewhere.",
			),
		)
	}
	return failures
}
