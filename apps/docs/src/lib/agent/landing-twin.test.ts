import { describe, expect, test } from "bun:test"
import { AGENT_START_HEADING, agentPrompt } from "../agent-start"
import { PORTAL_ORIGIN, SITE_ORIGIN } from "../site"
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
				`- [CLI & Quickstart](${PORTAL_ORIGIN}/cli.md): Install traj, then record your first transaction and read your balance.`,
				"",
				"## For Contributors: help make the tax rules right",
				"",
				`- [Contribute](${PORTAL_ORIGIN}/contribute.md): Report a wrong figure, add a tax year or a country, and check your change.`,
				"",
				"## For Agents",
				"",
				`- The Docs index: Every page once, with its Markdown URL. \`${PORTAL_ORIGIN}/llms.txt\``,
			].join("\n"),
		)
	})

	test("starts with the Portal's name and ends with its Docs index reference", () => {
		const twin = buildLandingTwin(ORIGIN)
		expect(twin.startsWith("# Trajectonomics Docs\n\n> Documentation")).toBe(true)
		expect(twin.endsWith(`${indexReference(ORIGIN)}\n`)).toBe(true)
	})
})
