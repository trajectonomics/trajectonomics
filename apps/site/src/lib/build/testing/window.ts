import type { Dictionary } from "../../language/dictionary"
import { DOCS_CLI_INSTALL_PATH, INSTALL_PROMPT } from "../../site"

/** The parts of the install window a test replaces to break one rule at a time. */
export interface WindowParts {
	/** The prompt's `code` element, so a test can show other text in the window, or none. */
	readonly prompt?: string
	readonly button?: string
	/** Markup inside the window, after the prompt and its button: a second code, or anything else. */
	readonly window?: string
}

/** One Language's install window as the build must produce it: the prompt, its Copy control and the way out. */
export function installWindow(dictionary: Dictionary, parts: WindowParts = {}): string {
	const prompt = parts.prompt ?? `<code data-install-prompt>${INSTALL_PROMPT}</code>`
	const button =
		parts.button ??
		`<button type="button" data-copied="${dictionary.copied}" data-copied-label="${dictionary.copiedLabel}" data-copy-failed="${dictionary.copyFailed}">${dictionary.copy}</button>`
	return [
		"<div data-install-window>",
		`<div>${prompt}${button}</div>`,
		parts.window ?? "",
		`<a href="${DOCS_CLI_INSTALL_PATH}">${dictionary.cliInstallLink}</a>`,
		"</div>",
	].join("\n")
}
