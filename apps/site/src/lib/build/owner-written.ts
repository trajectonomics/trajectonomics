import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtHomes } from "./language-home"

/** The owner's placeholder stays visible, so no agent invents money or tax meaning. */
export function checkOwnerWritten(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files)
		.filter(({ file }) => !file.content.includes(OWNER_WRITTEN_PLACEHOLDER))
		.map(({ file }) =>
			buildFailure(
				"OWNER_WRITTEN_MISSING",
				file.path,
				`shows no "${OWNER_WRITTEN_PLACEHOLDER}" string; only the owner may write that text.`,
			),
		)
}
