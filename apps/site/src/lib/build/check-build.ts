import type { BuiltFile } from "./built-files"
import { checkExternalResources } from "./external-resources"
import type { BuildFailure } from "./failures"
import { checkContentSecurityPolicy } from "./policy"
import { checkReservedPreloadPath } from "./reserved-path"
import { checkStructure } from "./structure"

/** Every rule the built Site fails, so one run names all of them instead of the first. */
export function checkBuild(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [
		...checkStructure(files),
		...checkReservedPreloadPath(files),
		...checkContentSecurityPolicy(files),
		...checkExternalResources(files),
	]
}

export type { BuiltFile } from "./built-files"
export type { BuildFailure, BuildFailureCode } from "./failures"
