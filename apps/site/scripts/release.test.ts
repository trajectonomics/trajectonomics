import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { ReleaseSnapshot } from "../src/lib/site/release"
import type { ReleaseFeed } from "../src/lib/site/release-feed"
import { driftBody, driftTitle } from "./release-drift-report"
import { describeStatus } from "./release-status"

/** A snapshot and a feed one release apart, so every line a report prints names both versions. */
const SNAPSHOT: ReleaseSnapshot = { version: "0.2.0", releasedOn: "2026-11-17", asOf: "2026-11-19" }
const FEED: ReleaseFeed = { latest: "0.3.0", releasedOn: "2027-02-01" }

/** The Release snapshot's Pure Cores and the built-file rules that judge them, relative to this script. */
const RELEASE_CORE = join("src", "lib")

/** The one directory outside the Pure Core: the page's own script, which must call the analytics endpoint. */
const PAGE_SCRIPT = "analytics/"

/** The clock, the host locale and the network: the three an offline build and a fixture test cannot have. */
const IMPURE = /\b(fetch\(|new Date|Date\.now|Intl\.|Math\.random|process\.env)/

/** Every TypeScript source under `src/lib`, so this rule judges the whole Pure Core and not one directory. */
function pureCoreSources(): readonly string[] {
	return readdirSync(join(import.meta.dir, "..", RELEASE_CORE), {
		recursive: true,
		encoding: "utf8",
	})
		.filter((path) => path.endsWith(".ts") && !path.startsWith(PAGE_SCRIPT))
		.map((path) => join(RELEASE_CORE, path))
}

describe("the Pure Core the Release snapshot belongs to", () => {
	it("reads no clock, no host locale and no network, so a build stays offline and a page stays fixed", () => {
		const sources = pureCoreSources()
		expect(sources.length).toBeGreaterThan(100)
		for (const path of sources) {
			expect({
				path,
				impure: IMPURE.exec(readFileSync(join(import.meta.dir, "..", path), "utf8"))?.[0],
			}).toEqual({
				path,
				impure: undefined,
			})
		}
	})

	it("keeps the Release snapshot the only place a release fact enters the Site, so no page holds a copy", () => {
		const snapshot = JSON.parse(
			readFileSync(join(import.meta.dir, "..", "src", "lib", "site", "release.json"), "utf8"),
		) as Record<string, unknown>
		expect(Object.keys(snapshot).sort()).toEqual(["asOf", "releasedOn", "version"])
	})
})

describe("where the snapshot stands, in one line", () => {
	it("says the Site names the release npm publishes when the snapshot is current", () => {
		const message = describeStatus(SNAPSHOT, "current", {
			latest: SNAPSHOT.version,
			releasedOn: "",
		})
		expect(message).toBe(`the Site names v${SNAPSHOT.version}, latest is v${SNAPSHOT.version}`)
	})

	it("waits while npm's latest has no published release, and never calls that drift", () => {
		const message = describeStatus(SNAPSHOT, "waiting", { latest: "9.9.9", releasedOn: undefined })
		expect(message).toContain("waiting")
		expect(message).toContain("9.9.9")
		expect(message.includes("Release drift")).toBe(false)
	})

	it("opens with Release drift and names both versions when the snapshot is behind", () => {
		const message = describeStatus(SNAPSHOT, "drift", FEED)
		expect(message.startsWith("Release drift:")).toBe(true)
		expect(message).toContain("v0.3.0")
		expect(message).toContain("v0.2.0")
	})
})

describe("the issue a drift is reported as", () => {
	it("titles it with both versions, so a stale title is visible in the list", () => {
		expect(driftTitle(SNAPSHOT, FEED)).toBe(
			"Release drift: the Site names v0.2.0, latest is v0.3.0",
		)
	})

	it("names the snapshot, the feed and the one command that repairs it", () => {
		const body = driftBody(SNAPSHOT, FEED)
		expect(body).toContain("v0.2.0")
		expect(body).toContain("0.3.0")
		expect(body).toContain("bun run release:update")
	})
})
