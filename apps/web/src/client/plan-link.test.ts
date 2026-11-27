import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { navigations, setTestUrl } from "../../scripts/svelte/app-stub"
import { followPlanLink } from "./plan-link.js"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH } from "./what-if.test-support"

/** A click on a link, with the parts of it a browser reads: a modified one opens the link elsewhere. */
function click(
	overrides: Partial<Pick<MouseEvent, "button" | "ctrlKey" | "metaKey" | "shiftKey">> = {},
) {
	let prevented = false
	const event = {
		button: 0,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...overrides,
		preventDefault: () => {
			prevented = true
		},
	}
	return { event: event as unknown as MouseEvent, prevented: () => prevented }
}

beforeEach(() => {
	navigations.length = 0
})

afterEach(() => {
	whatIfSession.end()
	navigations.length = 0
	setTestUrl("http://127.0.0.1/")
})

describe("a link that names a plan", () => {
	test("switches the page's plan, then lets the link navigate as usual", () => {
		setTestUrl("http://127.0.0.1/fi/?scenario=base")
		const { event, prevented } = click()
		followPlanLink(event, "retire-early")
		expect(prevented()).toBe(false)
		expect(navigations).toEqual(["/fi/?scenario=retire-early"])
	})

	test("stays on the page, and keeps its plan, when the What-if session asks first", () => {
		setTestUrl("http://127.0.0.1/fi/?scenario=base")
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		const { event, prevented } = click()
		followPlanLink(event, "retire-early")
		expect(prevented()).toBe(true)
		expect(navigations).toEqual([])
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.whatIf?.plan).toBe("base")
	})

	test("leaves a modified click to the browser: no switch, no question, no navigation here", () => {
		setTestUrl("http://127.0.0.1/fi/?scenario=base")
		whatIfSession.setOff("base", HASH, "flows.salary", true)
		for (const modified of [
			{ ctrlKey: true },
			{ metaKey: true },
			{ shiftKey: true },
			{ button: 1 },
		]) {
			const { event, prevented } = click(modified)
			followPlanLink(event, "retire-early")
			expect(prevented()).toBe(false)
		}
		expect(navigations).toEqual([])
		expect(whatIfSession.asking).toBeNull()
	})
})
