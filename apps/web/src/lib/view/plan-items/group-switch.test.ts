import { describe, expect, test } from "bun:test"
import { type Baseline, type Read, type ScenarioDocument, scenarioDocument } from "../../contract"
import { overlayDocument } from "../../what-if/overlay"
import { startWhatIf, withGroupOff } from "../../what-if/session"
import { flowItems } from "../what-if/plan-items"
import { assetCardsOf } from "./asset-card"
import { homeDraft, planWithHome } from "./asset-fixtures.test-support"
import { baselineRead } from "./fixtures.test-support"
import type { GroupSwitch } from "./group-switch"
import { loanCardsOf, plainAccounts, unplacedFlows } from "./loan-card"
import { loanPlanDocument } from "./loan-fixtures.test-support"

const NOTHING_HELD = baselineRead()
const home = planWithHome(homeDraft({ saleDate: "2028-07-15" }))

/** The Baseline with a balance in the Account of that id, as one the ledger holds. */
function holding(id: string): Read<Baseline> {
	const read = baselineRead()
	if (!read.ok) throw new Error("no baseline")
	const row = { account: { id, name: id }, kind: "liability", amount: "-5000.00" } as const
	return { ...read, data: { ...read.data, rows: [...read.data.rows, row] } }
}

/** The document a session shows when the switch of a card is off. */
function switchedOff(doc: ScenarioDocument, card: { switch: GroupSwitch }) {
	const { spec, removals } = card.switch
	return overlayDocument(doc, withGroupOff(startWhatIf("base", "hash"), spec, removals))
}

/** What no plan may hold: a Flow of an Account the plan does not declare, or a debt nothing borrows or repays. */
function dangling(doc: ScenarioDocument): string[] {
	const accounts = new Set(doc.accounts.map((account) => account.id))
	return doc.flows.flatMap((flow) =>
		[flow.target, flow.source]
			.filter((id) => id !== undefined && !accounts.has(id))
			.map((id) => `${flow.id} -> ${id}`),
	)
}

describe("a loan's switch takes its parts out together", () => {
	const doc = loanPlanDocument()
	const [card] = loanCardsOf(doc, undefined, NOTHING_HELD)

	test("its payment, its draw and its Account leave, and nothing is left that names the Account", () => {
		if (card === undefined) throw new Error("no loan card")
		expect(card.switch.spec.paths).toEqual(["accounts.loan", "flows.car-loan", "flows.car-draw"])
		const next = switchedOff(doc, card)
		expect(next.accounts.map((account) => account.id)).not.toContain("loan")
		expect(next.flows.map((flow) => flow.id)).not.toContain("car-loan")
		expect(next.flows.map((flow) => flow.id)).not.toContain("car-draw")
		expect(dangling(next)).toEqual([])
	})

	test("an extra payment into the loan leaves with it", () => {
		const extra = scenarioDocument.parse({
			...doc,
			flows: [
				...doc.flows,
				{
					id: "loan-extra-1",
					kind: "contribution",
					target: "loan",
					frequency: "once",
					start: "2028-01-01",
					amount: "1000.00",
					growth: { bps: 0 },
				},
			],
		})
		const [withExtra] = loanCardsOf(extra, undefined, NOTHING_HELD)
		if (withExtra === undefined) throw new Error("no loan card")
		expect(withExtra.switch.removals).toContain("flows.loan-extra-1")
		expect(dangling(switchedOff(extra, withExtra))).toEqual([])
	})

	test("an Account the Baseline holds stays declared, so every read still has it", () => {
		const [kept] = loanCardsOf(doc, undefined, holding("loan"))
		expect(kept?.switch.spec.paths).toContain("accounts.loan")
		expect(kept?.switch.removals).toEqual(["flows.car-loan", "flows.car-draw"])
		if (kept === undefined) throw new Error("no loan card")
		const next = switchedOff(doc, { switch: kept.switch })
		expect(next.accounts.map((account) => account.id)).toContain("loan")
		expect(dangling(next)).toEqual([])
	})
})

describe("an asset's switch takes its parts out together", () => {
	const [card] = assetCardsOf(home, undefined, undefined)

	test("no part is left: not the loan, not its draw, not its payoff", () => {
		if (card === undefined) throw new Error("no asset card")
		const next = switchedOff(home, card)
		expect(next.accounts.map((account) => account.id)).not.toContain("home")
		expect(next.accounts.map((account) => account.id)).not.toContain("home-loan")
		expect(next.flows.map((flow) => flow.id).filter((id) => id.startsWith("home"))).toEqual([])
		expect(dangling(next)).toEqual([])
	})

	test("the Account the Baseline holds stays declared, with its loan gone", () => {
		const [kept] = assetCardsOf(home, holding("home"), undefined)
		if (kept === undefined) throw new Error("no asset card")
		const next = switchedOff(home, kept)
		expect(next.accounts.map((account) => account.id)).toContain("home")
		expect(next.accounts.map((account) => account.id)).not.toContain("home-loan")
		expect(dangling(next)).toEqual([])
	})
})

describe("no control offers a part of a loan or an asset on its own", () => {
	test("the Income and Expenses lists, the plain Account cards and the read-only loans hold none of the parts", () => {
		for (const doc of [home, loanPlanDocument()]) {
			const parts = new Set(
				[...assetCardsOf(doc, undefined, undefined), ...loanCardsOf(doc, undefined)].flatMap(
					(card) => card.switch.spec.paths.map((path) => path.split(".")[1]),
				),
			)
			const single = [
				...flowItems(doc, "income", null, null).cards.map((one) => one.id),
				...flowItems(doc, "expense", null, null).cards.map((one) => one.id),
				...plainAccounts(doc).map((one) => one.id),
				...unplacedFlows(doc).map((one) => one.id),
			]
			expect(single.filter((id) => parts.has(id))).toEqual([])
		}
	})
})
