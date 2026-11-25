import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { chanceViewOf } from "../../lib/view/chance/page"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ChanceResult from "../chance/ChanceResult.svelte"
import AssumptionsBody from "./AssumptionsBody.svelte"
import AssumptionsForm from "./AssumptionsForm.svelte"
import ChanceSettings from "./ChanceSettings.svelte"

afterEach(() => {
	editSession.token = null
	editSession.error = null
	editSession.failure = null
	editSession.source = "form"
})

const page = (snapshot: Snapshot = DEMO, editable = true) =>
	render(AssumptionsBody, { props: { snapshot, scenario: "base", editable } }).body

describe("the Assumptions page", () => {
	test("has a row for each asset Account and none for a loan; an illiquid asset shows its return only", () => {
		const body = page()
		expect(body.match(/<h3 class="font-medium[^>]*>/g)).toHaveLength(3)
		expect(body).toContain("condo")
		expect(body).not.toContain("condo-loan")
		expect(body.match(/<label for="rate-/g)).toHaveLength(3)
		expect(body.match(/<label for="volatility-/g)).toHaveLength(2)
		expect(body).toContain("An asset you cannot sell at once shows its return only.")
		expect(body.match(/<label for="fee-rate-/g)).toHaveLength(2)
	})

	test("states the stored inflation and rates, and fills in no volatility: an empty one reads fixed at its return", () => {
		const body = page()
		expect(body).toContain('value="3.00"')
		expect(body).toContain('value="5.00"')
		expect(body.match(/Empty: fixed at its return in every path\./g)).toHaveLength(2)
		expect(body).not.toMatch(/id="volatility-[^"]*"[^>]*value="[^"]/)
	})

	test("offers three plain choices beside each volatility, as buttons that fill the field", () => {
		const body = page()
		for (const text of [
			"Steady",
			"Moderate",
			"Large",
			"such as deposits",
			"such as mixed funds",
			"such as shares",
		]) {
			expect(body).toContain(text)
		}
		expect(body.match(/type="button"[^>]*aria-pressed/g)).toHaveLength(6)
	})

	test("shows Save and Try as what-if only when the server answers, and no control in the Demo", () => {
		expect(page(DEMO, false)).not.toContain("Try as what-if")
		expect(page(DEMO, false)).not.toContain("Steady")
		expect(page(DEMO, true)).toContain("Try as what-if")
		expect(page(DEMO, true)).toMatch(/<button[^>]*type="submit"[^>]*>\s*Save\s*<\/button>/)
	})

	test("offers the chance's paths and seed empty when the Snapshot states none, and says so", () => {
		const none = {
			...DEMO,
			params: { ...DEMO.params, chance: null },
			reads: { ...DEMO.reads, chance: {} },
		}
		const body = page(none)
		expect(body).toContain("No chance of success is read yet")
		expect(body).toMatch(/id="chance-paths"[^>]*value=""/)
		expect(body).toMatch(/id="chance-seed"[^>]*value=""/)
	})

	test("shows the paths and seed the Snapshot states, and where the model came from", () => {
		const base = DEMO.reads.chance["base"]
		if (base === undefined || !base.ok) throw new Error("the Demo has a chance read")
		const read = {
			...base,
			data: {
				...base.data,
				returnModel: {
					source: "plan" as const,
					buckets: 256,
					accounts: [{ id: "fund", rate: 500, volatility: 1500 }],
				},
			},
		}
		const snapshot = {
			...DEMO,
			params: {
				...DEMO.params,
				chance: { source: "plan" as const, paths: 500, seed: "0123456789abcdef" },
			},
			reads: { ...DEMO.reads, chance: { base: read } },
		}
		const body = page(snapshot)
		expect(body).toContain('value="500"')
		expect(body).toContain('value="0123456789abcdef"')
		expect(body).toContain("Built from your plan")
		expect(body).toMatch(
			/data-account="fund"[^>]*>fund<\/code>(<!--\]-->)?<!---->: returns 5.00% a year, swings 15.00%/,
		)
	})

	test("fits a phone: each field is full width in one column, the choices wrap, and nothing has a fixed width", () => {
		const body = page()
		expect(body).toContain("grid gap-4 sm:grid-cols-2")
		expect(body).toContain("flex flex-wrap gap-2")
		expect(body).toContain("w-full rounded-md")
		expect(body).not.toMatch(/min-w-\[|(?<!max-)w-\[\d/)
		expect(body).not.toContain("overflow-x")
	})
})

describe("an error is shown once, in the form that sent it", () => {
	const show = (() => {
		const read = DEMO.reads.documents["base"]
		if (read === undefined || !read.ok) throw new Error("the Demo has a document")
		return read.data.scenario
	})()
	const first = show.document.accounts.find((one) => one.kind === "asset")?.id
	const refusal = {
		code: "invalid",
		exitCode: 1,
		message: "volatility out of range",
		path: `document.accounts.${first}.volatility`,
	}
	const form = () => render(AssumptionsForm, { props: { name: "base", show, editable: true } }).body
	const chance = () =>
		render(ChanceSettings, { props: { params: DEMO.params, read: undefined, editable: true } }).body

	test("a refusal of a swing shows at its row only, not under Chance of success", () => {
		editSession.source = "assumptions"
		editSession.error = refusal.message
		editSession.failure = refusal
		expect(form().split(refusal.message)).toHaveLength(2)
		expect(chance()).not.toContain(refusal.message)
	})

	test("a failed chance reread shows under Chance of success only, not in the Assumptions form", () => {
		editSession.source = "form"
		editSession.error = "reread failed"
		expect(chance().split("reread failed")).toHaveLength(2)
		expect(form()).not.toContain("reread failed")
	})
})

describe("the Chance page names its source", () => {
	const view = (extra = {}) => chanceViewOf(chanceFixture(extra))

	test("built from the plan when the CLI echoes the model it built", () => {
		const body = render(ChanceResult, {
			props: {
				argv: [],
				plan: "base",
				futures: null,
				view: view({
					returnModel: {
						source: "plan",
						buckets: 256,
						accounts: [{ id: "fund", rate: 500, volatility: 1500 }],
					},
				}),
			},
		}).body
		expect(body).toContain("Built from your plan")
		expect(body).toContain("Assumptions")
	})

	test("a file otherwise", () => {
		const body = render(ChanceResult, {
			props: { argv: [], plan: "base", futures: null, view: view() },
		}).body
		expect(body).toContain("Read from a Return model file")
	})
})
