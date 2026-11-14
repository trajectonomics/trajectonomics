import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { INSTALL_COMMAND } from "../site"
import { checkSiteContent } from "./site-content"
import { heroCodes, heroHome, heroHomes } from "./testing/hero"

const command = `<code>${INSTALL_COMMAND}</code>`

describe("the install command on a Language home", () => {
	it("passes a home that shows the fixture in a code element, beside its Copy button", () => {
		expect(heroCodes(checkSiteContent)).toEqual([])
	})

	it("passes the Thai home, whose button and messages are Thai", () => {
		expect(heroCodes(checkSiteContent, heroHome("th"))).toEqual([])
	})

	it("fails a home with no code element showing the fixture", () => {
		expect(
			heroCodes(checkSiteContent, heroHome("en", { command: "<code>npx skills add other</code>" })),
		).toEqual(["INSTALL_COMMAND_MISSING"])
	})

	it("fails a home whose command is in the HTML only inside a script", () => {
		const script = `<script>const command = "${INSTALL_COMMAND}"</script>`
		expect(heroCodes(checkSiteContent, heroHome("en", { command: "", extra: script }))).toEqual([
			"INSTALL_COMMAND_MISSING",
			"INSTALL_COMMAND_SCRIPT_ONLY",
		])
	})
})

describe("the Copy control", () => {
	it("fails a home with no Copy button", () => {
		expect(heroCodes(checkSiteContent, heroHome("en", { command, button: "" }))).toEqual([
			"COPY_BUTTON_MISSING",
		])
	})

	it("fails a home whose button shows the other Language's label", () => {
		const button = `<button type="button">${dictionaryFor("th").copy}</button>`
		expect(heroCodes(checkSiteContent, heroHome("en", { command, button }))).toContain(
			"COPY_BUTTON_LABEL_MISMATCH",
		)
	})

	it("fails a home whose button is not a sibling of the command", () => {
		expect(
			heroCodes(checkSiteContent, heroHome("en", { command: `<div>${command}</div>` })),
		).toEqual(["COPY_BUTTON_NOT_SIBLING"])
	})

	it("fails a home whose button carries neither copy message", () => {
		const button = `<button type="button">${dictionaryFor("en").copy}</button>`
		expect(heroCodes(checkSiteContent, heroHome("en", { command, button }))).toEqual([
			"COPY_MESSAGES_MISSING",
		])
	})
})

describe("the unscoped npm package", () => {
	it("fails a build that shows npx traj in any file", () => {
		const files = [...heroHomes(), { path: "_astro/x.js", content: "npx traj" }]
		expect(checkSiteContent(files).map((failure) => failure.code)).toEqual([
			"UNSCOPED_PACKAGE_SHOWN",
		])
	})

	it("passes a build that shows npx skills and never npx traj", () => {
		expect(heroCodes(checkSiteContent)).toEqual([])
	})
})
