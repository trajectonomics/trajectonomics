import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { checkTextContrast } from "./contrast"
import { checkExternalAssets } from "./external-assets"
import type { BuildFailure } from "./failures"
import { checkHreflang } from "./hreflang"
import { checkLandmarkColours } from "./landmark-colours"
import { checkLandmarks } from "./landmarks"
import { checkLanguageHomes } from "./language-home"
import { type BuildMode, DEFAULT_BUILD_MODE } from "./mode"
import { checkNoLanguageDetection } from "./no-language-detection"
import { checkNotFoundPages } from "./not-found-pages"
import { checkOwnerPlaceholder, checkOwnerWritten } from "./owner-written"
import { checkPageLinks } from "./page-links"
import { checkPageText } from "./page-text"
import { checkPageWeight } from "./page-weight"
import { checkContentSecurityPolicy } from "./policy"
import { checkReservedPreloadPath } from "./reserved-path"
import { checkSiteContent } from "./site-content"
import { checkSiteLinks } from "./site-links"
import { checkStructure } from "./structure"
import { checkSwitcher } from "./switcher"
import { checkThaiTextLanguage } from "./thai-text"
import { checkTheme } from "./theme"
import { checkNoWebFonts } from "./web-fonts"

/** Every rule the built Site fails, so one run names all of them instead of the first. */
export function checkBuild(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
	mode: BuildMode = DEFAULT_BUILD_MODE,
): readonly BuildFailure[] {
	return [
		...checkStructure(files),
		...checkPageLinks(files),
		...checkReservedPreloadPath(files),
		...checkContentSecurityPolicy(files),
		...checkExternalAssets(files),
		...checkLandmarks(files),
		...checkTheme(files, tokens),
		...checkLandmarkColours(files, tokens),
		...checkTextContrast(files, tokens),
		...checkNoWebFonts(files),
		...checkPageWeight(files),
		...checkLanguageHomes(files),
		...checkHreflang(files),
		...checkSwitcher(files),
		...checkOwnerWritten(files, mode),
		...checkOwnerPlaceholder(files, mode),
		...checkNoLanguageDetection(files),
		...checkNotFoundPages(files),
		...checkSiteContent(files),
		...checkSiteLinks(files),
		...checkPageText(files),
		...checkThaiTextLanguage(files),
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
