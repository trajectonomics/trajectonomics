import { SURFACE } from "./posthog"

/**
 * The event the Copy button sends when the prompt reaches the clipboard. The name and the `install`
 * value below are the series' wire values and never move with the page's words: a metric that renamed
 * itself would split the series it exists to produce (ADR 0011, ADR 0015).
 */
export const PROMPT_COPIED_EVENT = "site_command_copied"

/** One prompt the Copy button put on the clipboard. */
export interface CopiedPrompt {
	/** A stable name for what was copied, not its text: the text changes with every release. */
	readonly prompt: string
	readonly language: string
}

/** The detail the Copy button dispatches on its signal: a wire value, so its key stays `command`. */
export interface CopiedSignal {
	readonly command: string
}

/**
 * The prompt one signal reports, read from the detail the button dispatches. The detail's key stays
 * `command` because the measured series already carries it; only the code around it says prompt.
 */
export function copiedPrompt(signal: CopiedSignal, language: string): CopiedPrompt {
	return Object.freeze({ prompt: signal.command, language })
}

/**
 * The properties of one copied prompt: what was copied and the Language of the page it sat on. The
 * property stays `command`, because that is the name the measured series already carries.
 */
export function promptCopiedProperties(copied: CopiedPrompt): Readonly<Record<string, string>> {
	return Object.freeze({ command: copied.prompt, language: copied.language, surface: SURFACE })
}
