import { describe, expect, test } from "bun:test"
import { indexReference } from "./index-reference"
import { buildLandingTwin } from "./landing-twin"

const ORIGIN = "https://trajectonomics.com"

describe("the Landing Page's Markdown twin", () => {
	test("states the Portal's name and purpose, then one entry per Tab's Markdown", () => {
		expect(buildLandingTwin(ORIGIN)).toBe(
			[
				"# Trajectonomics Docs",
				"",
				"> Documentation for running the Trajectonomics CLI and helping make its tax rules right.",
				"",
				"## For Operators: install and run the CLI",
				"",
				"- [CLI & Quickstart](https://trajectonomics.com/docs/cli.md): Install traj, then record your first transaction and read your balance.",
				"",
				"## For Contributors: help make the tax rules right",
				"",
				"- [Contribute](https://trajectonomics.com/docs/contribute.md): Report a wrong figure, add a tax year or a country, and check your change.",
				"",
				indexReference(ORIGIN),
				"",
			].join("\n"),
		)
	})
})
