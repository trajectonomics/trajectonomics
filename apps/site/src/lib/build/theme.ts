import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { checkThemeAttribute } from "./theme-attribute"
import { checkThemeColourScheme } from "./theme-colour-scheme"
import { checkThemeCss } from "./theme-css"
import { checkThemeDeviceScheme } from "./theme-device-scheme"
import { checkThemeHead } from "./theme-head"

/** Every rule that the built Site is painted by the Themes the build ships, before and after first paint. */
export function checkTheme(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
	themes: readonly string[],
): readonly BuildFailure[] {
	return [
		...checkThemeAttribute(files, tokens, themes),
		...checkThemeHead(files),
		...checkThemeCss(files, tokens),
		...checkThemeColourScheme(files, themes),
		...checkThemeDeviceScheme(files, themes),
	]
}
