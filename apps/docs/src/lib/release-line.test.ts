import { describe, expect, test } from "bun:test"
import { newestCliVersion, releaseLine } from "./release-line"
import { readReleaseLine } from "./release-line-source"

describe("the newest cli release", () => {
	test("is the highest stable cli-vX.Y.Z tag, compared by number not by text", () => {
		expect(newestCliVersion(["cli-v0.2.0", "cli-v0.10.0", "cli-v0.9.3"])).toBe("0.10.0")
	})

	test("ignores tags of other packages, prereleases and bare version tags", () => {
		expect(newestCliVersion(["core-v0.9.0", "cli-v0.4.0-alpha.1", "v0.8.0", "cli-v0.3.0"])).toBe(
			"0.3.0",
		)
	})

	test("is undefined when no tag is a cli release", () => {
		expect(newestCliVersion([])).toBeUndefined()
		expect(newestCliVersion(["core-v0.3.0", "money-v0.1.0"])).toBeUndefined()
	})

	test("ignores blank lines and surrounding whitespace from git's output", () => {
		expect(newestCliVersion(["", " cli-v0.4.0 ", ""])).toBe("0.4.0")
	})
})

describe("the Landing Page's release line", () => {
	test("names the version without the tag prefix", () => {
		expect(releaseLine("0.4.0")).toBe("Docs for traj 0.4.0")
	})

	test("is omitted when there is no version", () => {
		expect(releaseLine(undefined)).toBeUndefined()
	})
})

describe("reading the release line at build time", () => {
	test("names the newest tag git lists for this build", () => {
		expect(readReleaseLine(() => "cli-v0.3.0\ncli-v0.4.0\n")).toBe("Docs for traj 0.4.0")
	})

	test("is omitted when the build has no cli tag, as in a shallow clone", () => {
		expect(readReleaseLine(() => "")).toBeUndefined()
	})

	test("is omitted, without failing, when the build has no git", () => {
		expect(
			readReleaseLine(() => {
				throw new Error("git: command not found")
			}),
		).toBeUndefined()
	})
})
