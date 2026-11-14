import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtHomes } from "./language-home"
import type { BuildMode } from "./mode"
import { pageUrl } from "./page-url"

/** The field a failure names: the page URL for a page, the file path for anything else. */
function fieldOf(file: BuiltFile): string {
	return file.path.endsWith(".html") ? pageUrl(file.path) : file.path
}

/** A preview or development build keeps the placeholder on every home, so no agent wrote that text. */
export function checkOwnerWritten(
	files: readonly BuiltFile[],
	mode: BuildMode,
): readonly BuildFailure[] {
	if (mode === "production") return []
	return builtHomes(files)
		.filter(({ file }) => !file.content.includes(OWNER_WRITTEN_PLACEHOLDER))
		.map(({ file }) =>
			buildFailure(
				"OWNER_WRITTEN_MISSING",
				pageUrl(file.path),
				`shows no "${OWNER_WRITTEN_PLACEHOLDER}" string; only the owner may write that text.`,
			),
		)
}

/** A production build carries no placeholder at all, so unfinished text cannot ship. */
export function checkOwnerPlaceholder(
	files: readonly BuiltFile[],
	mode: BuildMode,
): readonly BuildFailure[] {
	if (mode !== "production") return []
	return files
		.filter((file) => file.content.includes(OWNER_WRITTEN_PLACEHOLDER))
		.map((file) =>
			buildFailure(
				"OWNER_PLACEHOLDER_IN_PRODUCTION",
				fieldOf(file),
				`still contains "${OWNER_WRITTEN_PLACEHOLDER}"; a production build ships only text the owner wrote.`,
			),
		)
}
