import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { indexReference } from "./index-reference"
import { buildLandingTwin } from "./landing-twin"

const ORIGIN = SITE_ORIGIN

describe("the Landing Page's Markdown twin", () => {
	test("states the release line under the purpose when the build has one", () => {
		expect(buildLandingTwin(ORIGIN, "Docs for traj 0.4.0")).toContain(
			"> Documentation for running the Trajectonomics CLI and helping make its tax rules right.\n\nDocs for traj 0.4.0\n\n## For Operators",
		)
	})

	test("states the Portal's name and purpose, then one entry per Tab's Markdown", () => {
		expect(buildLandingTwin(ORIGIN)).toBe(
			[
				"# Trajectonomics Docs",
				"",
				"> Documentation for running the Trajectonomics CLI and helping make its tax rules right.",
				"",
				"## For Operators: install and run the CLI",
				"",
				"- [CLI & Quickstart](https://docs.trajectonomics.com/cli.md): Install traj, then record your first transaction and read your balance.",
				"",
				"## For Contributors: help make the tax rules right",
				"",
				"- [Contribute](https://docs.trajectonomics.com/contribute.md): Report a wrong figure, add a tax year or a country, and check your change.",
				"",
				indexReference(ORIGIN),
				"",
			].join("\n"),
		)
	})
})
