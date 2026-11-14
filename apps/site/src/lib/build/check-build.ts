import type { DesignTokens } from "../design/tokens"
import { checkAdvertisedLinks } from "./advertised-links"
import type { BuiltFile } from "./built-files"
import { checkTextContrast } from "./contrast"
import { checkExternalResources } from "./external-resources"
import type { BuildFailure } from "./failures"
import { checkNoDownloadedFonts } from "./fonts"
import { checkLandmarkColours } from "./landmark-colours"
import { checkLandmarks } from "./landmarks"
import { checkLanguageHomes } from "./language-home"
import { checkNoLanguageDetection } from "./no-language-detection"
import { checkNotFoundPages } from "./not-found-pages"
import { checkOwnerWritten } from "./owner-written"
import { checkContentSecurityPolicy } from "./policy"
import { checkReservedPreloadPath } from "./reserved-path"
import { checkStructure } from "./structure"
import { checkSwitcher } from "./switcher"
import { checkTheme } from "./theme"

/** Every rule the built Site fails, so one run names all of them instead of the first. */
export function checkBuild(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return [
		...checkStructure(files),
		...checkReservedPreloadPath(files),
		...checkContentSecurityPolicy(files),
		...checkExternalResources(files),
		...checkLandmarks(files),
		...checkTheme(files, tokens),
		...checkLandmarkColours(files, tokens),
		...checkTextContrast(files, tokens),
		...checkNoDownloadedFonts(files),
		...checkLanguageHomes(files),
		...checkAdvertisedLinks(files),
		...checkSwitcher(files),
		...checkOwnerWritten(files),
		...checkNoLanguageDetection(files),
		...checkNotFoundPages(files),
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
