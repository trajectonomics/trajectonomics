import { describe, expect, test } from "bun:test"
import { AGENT_START_HEADING, agentPrompt } from "../agent-start"
import { SITE_ORIGIN } from "../site"
import { indexReference } from "./index-reference"
import { buildLandingTwin } from "./landing-twin"

const ORIGIN = SITE_ORIGIN

describe("the Landing Page's Markdown twin", () => {
	test("states the release line under the purpose when the build has one", () => {
		expect(buildLandingTwin(ORIGIN, "Docs for traj 0.4.0")).toContain(
			"> Documentation for running the Trajectonomics CLI and helping make its tax rules right.\n\nDocs for traj 0.4.0\n\n## Start with your Agent",
		)
	})

	test("opens with the prompt a reader hands their Agent, in a text fence", () => {
		expect(buildLandingTwin(ORIGIN)).toContain(`## ${AGENT_START_HEADING}\n\nPaste this`)
		expect(buildLandingTwin(ORIGIN)).toContain(`\`\`\`text\n${agentPrompt(ORIGIN)}\n\`\`\``)
	})

	test("states one entry per Tab's Markdown, then the ways an Agent reads the Portal", () => {
		expect(buildLandingTwin(ORIGIN)).toContain(
			[
				"## For Operators: install and run the CLI",
				"",
				"- [CLI & Quickstart](https://docs.trajectonomics.com/cli.md): Install traj, then record your first transaction and read your balance.",
				"",
				"## For Contributors: help make the tax rules right",
				"",
				"- [Contribute](https://docs.trajectonomics.com/contribute.md): Report a wrong figure, add a tax year or a country, and check your change.",
				"",
				"## Every page reads as Markdown",
				"",
				"- The Docs index: Every page once, in Tab order, with its description and Markdown URL. `https://docs.trajectonomics.com/llms.txt`",
			].join("\n"),
		)
	})

	test("starts with the Portal's name and ends with its Docs index reference", () => {
		const twin = buildLandingTwin(ORIGIN)
		expect(twin.startsWith("# Trajectonomics Docs\n\n> Documentation")).toBe(true)
		expect(twin.endsWith(`${indexReference(ORIGIN)}\n`)).toBe(true)
	})
})
