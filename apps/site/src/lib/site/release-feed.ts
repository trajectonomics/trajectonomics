import { calendarDay, type ReleaseSnapshot } from "./release"
import { releaseError } from "./release-error"

/** What the release feeds say right now: npm's `latest`, and the release day of that same tag. */
export interface ReleaseFeed {
	/** The bare semver npm publishes as `latest`, which is what a visitor installs. */
	readonly latest: string
	/** The tag's release day as a UTC ISO date, or `undefined` while that release does not exist yet. */
	readonly releasedOn: string | undefined
}

/** Where the committed snapshot stands against the feeds: current, waiting on the release, or behind. */
export type ReleaseStatus = "current" | "waiting" | "drift"

/** What `bun run release:update` writes: the snapshot, or the reason it writes none. */
export type SnapshotWrite = { readonly written: ReleaseSnapshot } | { readonly waiting: string }

/** A published `published_at`, whose `Z` is what makes its calendar day the UTC one the Site prints. */
const PUBLISHED_AT = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

/** A JSON document as a record of unknown values, so a feed field is read only once it is typed. */
function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
	return typeof value === "object" && value !== null
		? (value as Readonly<Record<string, unknown>>)
		: undefined
}

/** The version npm's registry document publishes as `latest`. */
export function latestVersion(registry: unknown): string {
	const latest = record(record(registry)?.["dist-tags"])?.["latest"]
	if (typeof latest !== "string") {
		throw releaseError(
			"RELEASE_REGISTRY_UNREADABLE",
			"dist-tags.latest",
			"the npm registry document names no latest version.",
		)
	}
	return latest
}

/** The UTC calendar day a GitHub release was published, from its `published_at`. */
export function releasedOn(release: unknown): string {
	const published = record(release)?.["published_at"]
	const day = typeof published === "string" ? PUBLISHED_AT.exec(published)?.[1] : undefined
	if (day === undefined) {
		throw releaseError(
			"RELEASE_PAYLOAD_UNREADABLE",
			"published_at",
			`the release carries no UTC publish time in "${String(published)}".`,
		)
	}
	return day
}

/** Where the snapshot stands against the feed; a mid-publish `latest` waits instead of drifting. */
export function releaseStatus(snapshot: ReleaseSnapshot, feed: ReleaseFeed): ReleaseStatus {
	if (feed.latest === snapshot.version) return "current"
	// The CLI publishes to npm before the GitHub release, so that window is minutes long and a report
	// would file an issue a release repairs at once (cli ADR-0023).
	return feed.releasedOn === undefined ? "waiting" : "drift"
}

/** The snapshot to write for a feed, or the refusal of a version whose release does not exist yet. */
export function snapshotFor(feed: ReleaseFeed, asOf: string): SnapshotWrite {
	if (feed.releasedOn === undefined) {
		return Object.freeze({
			waiting: `npm's latest is ${feed.latest}, and v${feed.latest} has no published GitHub release yet, so the snapshot is unchanged.`,
		})
	}
	calendarDay(feed.releasedOn, "releasedOn")
	calendarDay(asOf, "asOf")
	return Object.freeze({
		written: Object.freeze({ version: feed.latest, releasedOn: feed.releasedOn, asOf }),
	})
}
