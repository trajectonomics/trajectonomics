import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { INSTALL_PROMPT } from "../site"
import { checkInstallWindow } from "./install-window"
import { heroCodes, heroHome } from "./testing/hero"

/** The prompt's `code` element, so a test can show other text in it, or none. */
const prompt = (text: string) => `<code data-install-prompt>${text}</code>`

describe("the prompt in a Language home's install window", () => {
	it("passes a home that shows the fixture in the window", () => {
		expect(heroCodes(checkInstallWindow)).toEqual([])
	})

	it("passes the Thai home, whose Copy button and messages are Thai", () => {
		expect(heroCodes(checkInstallWindow, heroHome("th"))).toEqual([])
	})

	it("fails a home whose window shows no prompt at all", () => {
		expect(heroCodes(checkInstallWindow, heroHome("en", { prompt: "" }))).toEqual([
			"PAGE_PROMPT_MISSING",
		])
	})

	it("fails a home whose only prompt text sits in a script, which the scanner never reads as page text", () => {
		const script = `<script>const prompt = "${INSTALL_PROMPT}"</script>`
		const empty = "<code data-install-prompt></code>"
		expect(
			heroCodes(checkInstallWindow, heroHome("en", { prompt: empty, window: script })),
		).toEqual(["PAGE_PROMPT_MISSING"])
	})

	it("fails a home that carries no install window, and so no prompt in one", () => {
		const home = heroHome("en")
		const stripped = {
			path: home.path,
			content: home.content.replace("<div data-install-window>", "<div>"),
		}
		expect(heroCodes(checkInstallWindow, stripped)).toEqual(["PAGE_PROMPT_MISSING"])
	})

	it("fails a home whose window shows other prompt text", () => {
		expect(
			heroCodes(
				checkInstallWindow,
				heroHome("en", { prompt: prompt("Set up traj: read the docs.") }),
			),
		).toEqual(["PROMPT_TEXT_MISMATCH"])
	})

	it("names the text the window shows and the text the fixture states", () => {
		const page = heroHome("th", { prompt: prompt("อ่านเอกสาร") })
		const failure = checkInstallWindow([page])[0]
		expect(failure?.message).toContain("อ่านเอกสาร")
		expect(failure?.message).toContain(INSTALL_PROMPT)
	})

	it("fails a window that carries a second code element, whatever it holds", () => {
		expect(
			heroCodes(
				checkInstallWindow,
				heroHome("en", { window: "<code>npx skills add other</code>" }),
			),
		).toContain("INSTALL_WINDOW_EXTRA_CODE")
	})
})

describe("the Copy control the window still holds", () => {
	it("fails a home with no Copy button", () => {
		expect(heroCodes(checkInstallWindow, heroHome("en", { button: "" }))).toEqual([
			"COPY_BUTTON_MISSING",
		])
	})

	it("fails a home whose button shows the other Language's label", () => {
		const button = `<button type="button">${dictionaryFor("th").copy}</button>`
		expect(heroCodes(checkInstallWindow, heroHome("en", { button }))).toContain(
			"COPY_BUTTON_LABEL_MISMATCH",
		)
	})

	it("fails a home whose button is not a sibling of the prompt", () => {
		expect(
			heroCodes(
				checkInstallWindow,
				heroHome("en", { prompt: `<div>${prompt(INSTALL_PROMPT)}</div>` }),
			),
		).toEqual(["COPY_BUTTON_NOT_SIBLING"])
	})

	it("fails a home whose button carries neither copy message", () => {
		const button = `<button type="button">${dictionaryFor("en").copy}</button>`
		expect(heroCodes(checkInstallWindow, heroHome("en", { button }))).toEqual([
			"COPY_MESSAGES_MISSING",
		])
	})
})
