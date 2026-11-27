import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { agentPrompt, agentRoutes, INSTALLATION_PAGE_PATH } from "./agent-start"
import { PORTAL_ORIGIN, SITE_ORIGIN } from "./site"
import { DOCS_BASE_PATH } from "./tabs"

const ORIGIN = SITE_ORIGIN

describe("the prompt a reader hands their Agent", () => {
	test("sends the Agent to the Docs index and the Installation page's twin, by absolute URL", () => {
		const prompt = agentPrompt(ORIGIN)
		expect(prompt).toContain(`${PORTAL_ORIGIN}/llms.txt`)
		expect(prompt).toContain(`${PORTAL_ORIGIN}/cli/installation.md`)
	})

	test("names the Installation section it follows, so the install command stays authored there", () => {
		const prompt = agentPrompt(ORIGIN)
		expect(prompt).toContain('"Add the agent skill"')
		expect(prompt).not.toContain("npx skills add")
		expect(readFileSync("src/content/docs/cli/installation.mdx", "utf8")).toContain(
			"## Add the agent skill",
		)
	})

	test("asks before it runs anything, and keeps every number to traj", () => {
		const prompt = agentPrompt(ORIGIN)
		expect(prompt).toContain("before you run anything")
		expect(prompt).toContain("never from your own arithmetic")
	})
})

describe("the ways an Agent reads the Portal on its own", () => {
	test("name the Docs index, a page's twin and the negotiated Markdown of the same page", () => {
		expect(agentRoutes(ORIGIN).map((route) => route.snippet)).toEqual([
			`${PORTAL_ORIGIN}/llms.txt`,
			`${PORTAL_ORIGIN}/cli/installation.md`,
			`curl -H "Accept: text/markdown" ${PORTAL_ORIGIN}/cli/installation/`,
		])
	})

	test("point at a page the content collection has", () => {
		const contentPath = INSTALLATION_PAGE_PATH.slice(DOCS_BASE_PATH.length)
		expect(existsSync(`src/content/docs${contentPath.replace(/\/$/, "")}.mdx`)).toBe(true)
	})
})
