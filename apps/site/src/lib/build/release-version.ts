import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Every version token a page prints: the tag form the pill and the release line name it in. */
const VERSION = /\bv\d+\.\d+\.\d+\b/g

/** The one version the pages may print, in the tag form the Release snapshot derives. */
const TAG = `v${RELEASE_SNAPSHOT.version}`

/** A page names the snapshot's version and no other; a page that names none breaks its own rule. */
export function versionFailures(file: BuiltFile): readonly BuildFailure[] {
	const printed = [...new Set([...file.content.matchAll(VERSION)].map((match) => match[0]))]
	if (printed.length === 0) {
		return [
			buildFailure(
				"RELEASE_VERSION_MISSING",
				file.path,
				`names no version; the Release snapshot names ${TAG}.`,
			),
		]
	}
	return printed
		.filter((tag) => tag !== TAG)
		.map((tag) =>
			buildFailure(
				"RELEASE_VERSION_UNKNOWN",
				file.path,
				`prints ${tag}; the Release snapshot names ${TAG}.`,
			),
		)
}
