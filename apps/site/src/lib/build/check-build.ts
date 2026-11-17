import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { checkTextContrast } from "./contrast"
import { checkDescription } from "./description"
import { checkDocumentTitle } from "./document-title"
import { checkExternalAssets } from "./external-assets"
import type { BuildFailure } from "./failures"
import { checkFonts } from "./fonts"
import { checkHreflang } from "./hreflang"
import { checkInstallWindow } from "./install-window"
import { checkLandmarkColours } from "./landmark-colours"
import { checkLandmarks } from "./landmarks"
import { checkLanguageHomes } from "./language-home"
import { type BuildMode, DEFAULT_BUILD_MODE } from "./mode"
import { checkNoLanguageDetection } from "./no-language-detection"
import { checkNotFoundPages } from "./not-found-pages"
import { checkOwnerPlaceholder } from "./owner-written"
import { checkPageLinks } from "./page-links"
import { checkPageText } from "./page-text"
import { checkPageWeight } from "./page-weight"
import { checkContentSecurityPolicy } from "./policy"
import { checkReservedPreloadPath } from "./reserved-path"
import { checkRobots } from "./robots"
import { checkSiteContent } from "./site-content"
import { checkSiteLinks } from "./site-links"
import { checkSitemap } from "./sitemap"
import { checkSocialCard } from "./social-card"
import { checkStructure } from "./structure"
import { checkStructuredData } from "./structured-data"
import { checkSwitcher } from "./switcher"
import { checkThaiTextLanguage } from "./thai-text"
import { checkTheme } from "./theme"
import { checkThemeColour } from "./theme-colour"

/** The rules that judge the built files alone, in the order their failures read. */
const FILE_RULES = [
	checkStructure,
	checkPageLinks,
	checkReservedPreloadPath,
	checkContentSecurityPolicy,
	checkExternalAssets,
	checkLandmarks,
	checkFonts,
	checkPageWeight,
	checkLanguageHomes,
	checkHreflang,
	checkSitemap,
	checkRobots,
	checkDocumentTitle,
	checkDescription,
	checkSocialCard,
	checkStructuredData,
	checkSwitcher,
	checkNoLanguageDetection,
	checkNotFoundPages,
	checkInstallWindow,
	checkSiteContent,
	checkSiteLinks,
	checkPageText,
	checkThaiTextLanguage,
] as const

/** The rules that judge the build against the Web Consumer Contract the Site pins. */
const TOKEN_RULES = [checkTheme, checkLandmarkColours, checkTextContrast, checkThemeColour] as const

/** Every rule the built Site fails, so one run names all of them instead of the first. */
export function checkBuild(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
	mode: BuildMode = DEFAULT_BUILD_MODE,
): readonly BuildFailure[] {
	return [
		...FILE_RULES.flatMap((rule) => rule(files)),
		...TOKEN_RULES.flatMap((rule) => rule(files, tokens)),
		...checkOwnerPlaceholder(files, mode),
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
