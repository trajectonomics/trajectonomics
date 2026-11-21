import type { ReleaseSnapshot } from "../src/lib/site/release"
import type { ReleaseFeed } from "../src/lib/site/release-feed"

/** The prefix every drift issue's title starts with, so one open issue is found and no second is filed. */
export const DRIFT_TITLE_PREFIX = "Release drift:"

/** What closes an issue whose drift a later run no longer finds. */
export const NOTHING_STALE =
	"The Site names the release npm publishes again, so this issue closes itself (`bun run release:check`)."

/** The issue's title: both versions, so a stale title is visible in the list. */
export function driftTitle(snapshot: ReleaseSnapshot, feed: ReleaseFeed): string {
	return `${DRIFT_TITLE_PREFIX} the Site names v${snapshot.version}, latest is v${feed.latest}`
}

/** The issue's body: what drifted, the two versions, and the one command that repairs it. */
export function driftBody(snapshot: ReleaseSnapshot, feed: ReleaseFeed): string {
	const { version, releasedOn, asOf } = snapshot
	return [
		"The Site prints one release, from the committed Release snapshot in `src/lib/site/release.json`,",
		"and that snapshot is behind the release npm publishes.",
		"",
		`- The snapshot names \`v${version}\`, released ${releasedOn}, read ${asOf}.`,
		`- npm's \`latest\` is \`${feed.latest}\`, released ${feed.releasedOn ?? "unknown"}.`,
		"",
		"Run `bun run release:update`, commit the snapshot it writes, and open a pull request. Every page's",
		"version, release line and date come from that one file, and `bun run check` fails a page that names",
		"any other.",
		"",
		"If this issue is still open when the snapshot is current again, the next weekly run closes it.",
	].join("\n")
}
