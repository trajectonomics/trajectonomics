import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import type { WhatIfAnswer } from "../../lib/what-if/answer"
import { startWhatIf, withSet } from "../../lib/what-if/session"
import WhatIfChanges from "./WhatIfChanges.svelte"

useSessionHooks()

afterEach(() => {
	preferences.hidden = false
})

const body = () => render(WhatIfChanges, { props: {} }).body

/** The server's answer to a what-if whose projection failed, naming this change. */
function refused(code: string, message: string): WhatIfAnswer {
	return {
		ok: true,
		reads: {
			projection: {
				argv: ["projection", "run", "--json", "--", "base"],
				ok: false,
				error: { code, exitCode: 1, message, details: { path: "flows.salary.earned" } },
			},
			fi: { argv: ["fi"], ok: true, data: {} },
			compare: { argv: ["compare"], ok: true, data: {} },
			chance: null,
		},
	}
}

describe("the What-if bar's changes", () => {
	test("does not mask the word for earned income when amounts are hidden", () => {
		preferences.hidden = true
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.salary.earned", false)
		expect(body()).toContain("salary income set to Passive")
	})

	test("masks a figure when amounts are hidden", () => {
		preferences.hidden = true
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.salary.amount", "90000.00")
		const html = body()
		expect(html).toContain("salary amount set to •••••")
		expect(html).not.toContain("90000.00")
	})

	test("hides only money: a name, how often, a category and an Account stay", () => {
		preferences.hidden = true
		const shown: [string, string, string][] = [
			["flows.salary.displayLabel", "Pay", "salary name set to Pay"],
			["flows.salary.frequency", "annual", "salary how often set to annual"],
			["flows.salary.category", "home", "salary category set to home"],
			["flows.salary.target", "fund", "salary move to set to fund"],
		]
		for (const [path, value, words] of shown) {
			whatIfSession.whatIf = withSet(startWhatIf("base", HASH), path, value)
			const html = body()
			expect(html).toContain(words)
			expect(html).not.toContain("amount hidden")
			expect(html).not.toContain("•••••")
		}
	})

	test("marks a refusal as the CLI's text only when the CLI wrote it", () => {
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.salary.earned", true)
		whatIfSession.answer = refused("invalid_input", "The CLI refused the change.")
		expect(body()).toContain("data-cli")
		whatIfSession.answer = refused("traj_unavailable", "The Dashboard could not start traj.")
		const html = body()
		expect(html).toContain("The Dashboard could not start traj.")
		expect(html).not.toContain("data-cli")
	})
})
