import { describe, expect, it } from "bun:test"
import { checkSiteContent } from "./site-content"
import { heroCodes, heroHome, heroHomes } from "./testing/hero"

describe("the unscoped npm package", () => {
	it("fails a build that shows npx traj in any file", () => {
		const files = [...heroHomes(), { path: "_astro/x.js", content: "npx traj" }]
		expect(checkSiteContent(files).map((failure) => failure.code)).toEqual(["FORBIDDEN_NPX_TRAJ"])
	})

	it("passes a home that shows no npx traj", () => {
		expect(heroCodes(checkSiteContent)).toEqual([])
	})
})

describe("the install command the window retired", () => {
	const retired = "npx skills add trajectonomics/skills --skill traj-onboarding"

	it("passes a Language home whose window shows the prompt and no command", () => {
		expect(heroCodes(checkSiteContent, heroHome("en"))).toEqual([])
		expect(heroCodes(checkSiteContent, heroHome("th"))).toEqual([])
	})

	it("fails a Language home that prints an npx skills add line", () => {
		const page = heroHome("en", { window: `<code>${retired}</code>` })
		expect(heroCodes(checkSiteContent, page)).toEqual(["INSTALL_COMMAND_RETURNED"])
	})

	it("fails a home that prints the line outside the window, so the tripwire is not window-scoped", () => {
		const page = heroHome("en", { extra: `<p>${retired}</p>` })
		expect(heroCodes(checkSiteContent, page)).toEqual(["INSTALL_COMMAND_RETURNED"])
	})

	it("judges built homes only, so a repository file carrying the line is left alone", () => {
		const files = [...heroHomes(), { path: "AGENTS.md", content: `Run \`${retired}\`.` }]
		expect(checkSiteContent(files)).toEqual([])
	})
})
