import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { checkTextContrast } from "./contrast"
import { checkExternalResources } from "./external-resources"
import type { BuildFailure } from "./failures"
import { checkLandmarkColours } from "./landmark-colours"
import { checkLandmarks } from "./landmarks"
import { checkContentSecurityPolicy } from "./policy"
import { checkReservedPreloadPath } from "./reserved-path"
import { checkStructure } from "./structure"
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
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
