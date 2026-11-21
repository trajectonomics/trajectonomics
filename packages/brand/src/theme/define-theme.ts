import type { Theme } from "../tokens/index"
import { semanticTokenContract } from "../tokens/index"
import type { ThemeInput } from "./theme-input"
import { validateTheme } from "./validation"

/** The checked factory for Themes: validates raw Theme data against the Semantic Token Contract. */
export function defineTheme(input: ThemeInput): Theme {
	const validated = validateTheme(input)
	return Object.freeze({
		name: validated.name,
		contractVersion: semanticTokenContract.version,
		tokens: Object.freeze({ ...validated.tokens }),
	})
}
