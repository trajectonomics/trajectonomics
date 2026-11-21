/**
 * The Landing Page's release line: the newest `cli-vX.Y.Z` release this build can see. Pure: the
 * tags come in as data, and the git read lives in `release-line-source.ts`.
 */

/** A cli release tag, stable only: prereleases are not what a reader installs. */
const CLI_TAG = /^cli-v(\d+)\.(\d+)\.(\d+)$/
const CLI_TAG_PREFIX = "cli-v"

type Triple = readonly [number, number, number]

function isNewer(candidate: Triple, current: Triple): boolean {
	const [major, minor, patch] = candidate
	const [currentMajor, currentMinor, currentPatch] = current
	if (major !== currentMajor) return major > currentMajor
	if (minor !== currentMinor) return minor > currentMinor
	return patch > currentPatch
}

/** The newest cli release among the tags, as its version without the `cli-v` prefix, or `undefined`. */
export function newestCliVersion(tags: readonly string[]): string | undefined {
	let newest: { readonly triple: Triple; readonly version: string } | undefined
	for (const tag of tags) {
		const match = CLI_TAG.exec(tag.trim())
		if (match === null) continue
		const triple: Triple = [Number(match[1]), Number(match[2]), Number(match[3])]
		if (newest === undefined || isNewer(triple, newest.triple)) {
			newest = { triple, version: tag.trim().slice(CLI_TAG_PREFIX.length) }
		}
	}
	return newest?.version
}

/** The line the Landing Page states for a version, or `undefined` when there is no release to name. */
export function releaseLine(version: string | undefined): string | undefined {
	return version === undefined ? undefined : `Docs for traj ${version}`
}
