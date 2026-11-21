import { describe, expect, it } from "bun:test"
import { latestVersion, releasedOn, releaseStatus, snapshotFor } from "./release-feed"
import { codeOf } from "./testing/error-code"

/** The npm registry document, as the adapter hands it on: only the tags are read. */
const REGISTRY = { "dist-tags": { bootstrap: "0.0.1-bootstrap.0", latest: "0.2.0" } }

const SNAPSHOT = { version: "0.2.0", releasedOn: "2026-11-17", asOf: "2026-11-18" }

describe("what the release feeds say", () => {
	it("reads the version npm publishes as latest", () => {
		expect(latestVersion(REGISTRY)).toBe("0.2.0")
	})

	it("rejects a registry document that names no latest", () => {
		expect(codeOf(() => latestVersion({ "dist-tags": { bootstrap: "0.0.1-bootstrap.0" } }))).toBe(
			"RELEASE_REGISTRY_UNREADABLE",
		)
	})

	it("dates a release by its UTC day, so a late-evening publish stays on its own day", () => {
		expect(releasedOn({ published_at: "2027-01-05T23:30:00Z" })).toBe("2027-01-05")
		expect(releasedOn({ tag_name: "v0.2.0", published_at: "2026-11-17T12:16:59Z" })).toBe(
			"2026-11-17",
		)
	})

	it("rejects a release whose date carries no UTC day it can read", () => {
		expect(codeOf(() => releasedOn({ published_at: "2026-11-17" }))).toBe(
			"RELEASE_PAYLOAD_UNREADABLE",
		)
	})
})

describe("where the snapshot stands against the feeds", () => {
	const feed = { latest: "0.3.0", releasedOn: "2027-02-01" }

	it("is current when npm's latest is the version the snapshot names", () => {
		expect(releaseStatus(SNAPSHOT, { latest: "0.2.0", releasedOn: "2026-11-17" })).toBe("current")
	})

	it("is drift when a newer latest is published, whatever the snapshot says", () => {
		expect(releaseStatus(SNAPSHOT, feed)).toBe("drift")
	})

	it("waits while a newer latest has no published release, so a mid-publish is never drift", () => {
		expect(releaseStatus(SNAPSHOT, { latest: "0.3.0", releasedOn: undefined })).toBe("waiting")
	})
})

describe("what bun run release:update writes", () => {
	it("writes the feed's version and release day, and the day it was read", () => {
		expect(snapshotFor({ latest: "0.2.0", releasedOn: "2026-11-17" }, "2026-11-19")).toEqual({
			written: { version: "0.2.0", releasedOn: "2026-11-17", asOf: "2026-11-19" },
		})
	})

	it("rejects a release day the month does not have, before it can be written", () => {
		const feed = { latest: "0.2.0", releasedOn: "2026-02-30" }
		expect(codeOf(() => snapshotFor(feed, "2026-03-01"))).toBe("RELEASE_DATE_INVALID")
	})

	it("rejects a day it cannot record as the date it was read", () => {
		const feed = { latest: "0.2.0", releasedOn: "2026-11-17" }
		expect(codeOf(() => snapshotFor(feed, "17/11/2026"))).toBe("RELEASE_DATE_INVALID")
	})

	it("refuses a version whose release does not exist yet, naming both values", () => {
		const write = snapshotFor({ latest: "0.3.0", releasedOn: undefined }, "2026-11-19")
		expect(write).toEqual({
			waiting: expect.stringContaining("0.3.0") as unknown as string,
		})
		expect("waiting" in write && write.waiting).toContain("v0.3.0")
	})
})
