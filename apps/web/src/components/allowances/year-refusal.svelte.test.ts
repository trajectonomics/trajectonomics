import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { allowancesView } from "../../lib/view/allowances"
import { separate } from "../../lib/view/allowances/separate.test-support"
import AllowancesResult from "./AllowancesResult.svelte"

const PLAN = {
	name: "base",
	contentHash: `jcs1:sha256:${"ab".repeat(32)}`,
	doc: { currency: "THB", flows: [], accounts: [] },
}
/** Two Returns, so the page holds two year cards with their own actions. */
const DATA = separate()
const [, SECOND] = allowancesView(DATA).returns.map((one) => one.current?.key ?? "")
const page = () =>
	render(AllowancesResult, { props: { data: DATA, plan: PLAN, claimsHolder: null } }).body
const count = (words: string) => page().split(words).length - 1
/** The year cards of the page, in the order of its Returns. */
const cards = () => page().split(': this tax year"').slice(1)

afterEach(() => {
	editSession.clear()
	editSession.source = "form"
})

describe("the page's year cards", () => {
	test("hold two Add to plan controls", () => {
		expect(count(">Add to plan</button>")).toBe(2)
	})

	test("show one stale notice for the page, in the card that sent the Edit", () => {
		editSession.source = `action:allowances:${SECOND}`
		editSession.stale = true
		expect(count(STALE_PLAN)).toBe(1)
		expect(cards()[0]).not.toContain(STALE_PLAN)
		expect(cards()[1]).toContain(STALE_PLAN)
	})

	test("say another control's refusal in none of them", () => {
		editSession.source = "form"
		editSession.stale = true
		expect(count(STALE_PLAN)).toBe(0)
	})
})
