import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { checkThemeAttribute } from "./theme-attribute"
import { checkThemeCss } from "./theme-css"
import { checkThemeHead } from "./theme-head"

/** Every rule that the built Site is painted by the published Theme, before and after first paint. */
export function checkTheme(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return [
		...checkThemeAttribute(files, tokens),
		...checkThemeHead(files),
		...checkThemeCss(files, tokens),
	]
}
