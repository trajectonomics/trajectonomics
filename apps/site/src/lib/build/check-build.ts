import { shippedThemes } from "../design/shipped-themes"
import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { checkTextContrast } from "./contrast"
import { checkDemoHome, isDemoFile } from "./demo"
import { checkDemoHeaders } from "./demo-headers"
import { checkDemoLinks } from "./demo-links"
import { checkDescription } from "./description"
import { checkDocumentTitle } from "./document-title"
import { checkExternalAssets } from "./external-assets"
import { checkFacts } from "./facts"
import type { BuildFailure } from "./failures"
import { checkFonts } from "./fonts"
import { checkHreflang } from "./hreflang"
import { checkIndexNowKey } from "./indexnow-key"
import { checkInstallWindow } from "./install-window"
import { checkLandmarkColours } from "./landmark-colours"
import { checkLandmarks } from "./landmarks"
import { checkLanguageHomes } from "./language-home"
import { checkLlmsFiles } from "./llms"
import { type BuildMode, DEFAULT_BUILD_MODE } from "./mode"
import { checkNoLanguageDetection } from "./no-language-detection"
import { checkNotFoundPages } from "./not-found-pages"
import { checkOpenJotPages } from "./openjot-pages"
import { checkOwnerPlaceholder } from "./owner-written"
import { checkPageLinks } from "./page-links"
import { checkPageText } from "./page-text"
import { checkPageWeight } from "./page-weight"
import { checkContentSecurityPolicy } from "./policy"
import { checkReleaseFacts } from "./release"
import { checkReservedPaths } from "./reserved-path"
import { checkRobots } from "./robots"
import { checkShareImage } from "./share-image"
import { checkSiteContent } from "./site-content"
import { checkSiteLinks } from "./site-links"
import { checkSitemap } from "./sitemap"
import { checkSocialCard } from "./social-card"
import { checkStructure } from "./structure"
import { checkStructuredData } from "./structured-data"
import { checkStructuredDataClaims } from "./structured-data-claims"
import { checkSwitcher } from "./switcher"
import { checkThaiTextLanguage } from "./thai-text"
import { checkTheme } from "./theme"
import { checkThemeColour } from "./theme-colour"

/** The rules that judge the built files alone, in the order their failures read. */
const FILE_RULES = [
	checkStructure,
	checkPageLinks,
	checkReservedPaths,
	checkContentSecurityPolicy,
	checkExternalAssets,
	checkLandmarks,
	checkFonts,
	checkPageWeight,
	checkLanguageHomes,
	checkOpenJotPages,
	checkHreflang,
	checkSitemap,
	checkRobots,
	checkLlmsFiles,
	checkIndexNowKey,
	checkDocumentTitle,
	checkDescription,
	checkSocialCard,
	checkShareImage,
	checkStructuredData,
	checkStructuredDataClaims,
	checkSwitcher,
	checkNoLanguageDetection,
	checkNotFoundPages,
	checkFacts,
	checkInstallWindow,
	checkSiteContent,
	checkSiteLinks,
	checkPageText,
	checkThaiTextLanguage,
	checkReleaseFacts,
] as const

/** The rules that judge the build against the Web Consumer Contract the Site pins, Themes aside. */
const TOKEN_RULES = [checkLandmarkColours, checkTextContrast] as const

/** Every rule the built Site fails, so one run names all of them instead of the first. */
export function checkBuild(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
	mode: BuildMode = DEFAULT_BUILD_MODE,
): readonly BuildFailure[] {
	const themes = shippedThemes(mode)
	// The Site's own rules judge the Site's pages and assets. The hosted Demo is a different build
	// with its own vocabulary, so it is judged by the Demo's rules instead ([ADR 0031]).
	const siteFiles = files.filter((file) => !isDemoFile(file.path))
	return [
		...FILE_RULES.flatMap((rule) => rule(siteFiles)),
		...TOKEN_RULES.flatMap((rule) => rule(siteFiles, tokens)),
		...checkTheme(siteFiles, tokens, themes),
		...checkThemeColour(siteFiles, tokens, themes),
		...checkOwnerPlaceholder(siteFiles, mode),
		...checkDemoHome(files),
		...checkDemoLinks(files),
		...checkDemoHeaders(files),
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
