import { describe, expect, it } from "bun:test"
import { PROMPT_COPIED_SIGNAL } from "./client"
import { copiedPrompt, PROMPT_COPIED_EVENT, promptCopiedProperties } from "./copy"
import { SURFACE } from "./posthog"

describe("the properties one copied prompt carries", () => {
	it("names what was copied by a stable name, never by the text a release changes", () => {
		expect(promptCopiedProperties({ prompt: "install", language: "th" })).toEqual({
			command: "install",
			language: "th",
			surface: SURFACE,
		})
	})

	it("keeps the wire values the copy series was measured with, whatever the page calls the thing", () => {
		expect(PROMPT_COPIED_EVENT).toBe("site_command_copied")
		expect(PROMPT_COPIED_SIGNAL).toBe("traj:site-command-copied")
	})

	it("reads the detail key the button dispatches, which stays command", () => {
		expect(copiedPrompt({ command: "install" }, "th")).toEqual({
			prompt: "install",
			language: "th",
		})
	})
})
