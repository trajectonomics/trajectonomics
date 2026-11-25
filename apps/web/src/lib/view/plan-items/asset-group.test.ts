import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { type ScenarioDocument, scenarioDocument } from "../../contract"
import { flowItems } from "../what-if/plan-items"
import { assetCardsOf } from "./asset-card"
import { assetDocument, realAssetById, realAssetsOf } from "./asset-document"
import { homeDraft, partsOf, planWithHome } from "./asset-fixtures.test-support"
import { assetFromDraft } from "./asset-from-draft"
import { newAssetId } from "./asset-ids"
import { assetsWithFlows } from "./asset-link"
import { ownedChoicesOf } from "./asset-owned"
import { assetLayoutOf, assetShown, fieldOfAssetRefusal } from "./asset-refusal"
import { withoutAsset } from "./asset-remove"
import { baselineRead, planDocument } from "./fixtures.test-support"
import { loanCardsOf } from "./loan-card"
import { plainAccounts, unplacedFlows } from "./unplaced"

const doc = planWithHome()

describe("a real asset's items are grouped under its card", () => {
	test("they are not repeated in Income, Expenses, the plain Accounts, the loan cards or the read-only loans", () => {
		const incomeIds = flowItems(doc, "income", null, null).cards.map((card) => card.id)
		const expenseIds = flowItems(doc, "expense", null, null).cards.map((card) => card.id)
		expect(incomeIds).not.toContain("home-rent")
		expect(expenseIds).not.toContain("home-running")
		expect(expenseIds).not.toContain("home-buying-cost")
		expect(plainAccounts(doc).map((a) => a.id)).not.toContain("home")
		expect(plainAccounts(doc).map((a) => a.id)).not.toContain("home-loan")
		expect(loanCardsOf(doc, undefined)).toEqual([])
		expect(unplacedFlows(doc).map((f) => f.id)).not.toContain("home-sale")
		expect(assetsWithFlows(doc, "expense")).toEqual(["home"])
		expect(assetsWithFlows(planDocument(), "expense")).toEqual([])
	})
})

describe("an item edited by hand in the terminal", () => {
	const edited = scenarioDocument.parse({
		...doc,
		flows: doc.flows.map((flow) =>
			flow.id === "home-running" ? { ...flow, frequency: "weekly" } : flow,
		),
	})

	test("is shown as an ordinary item, and the card says the asset was changed outside the form", () => {
		const [home] = realAssetsOf(edited)
		expect(home?.outside).toEqual(["home-running"])
		expect(home?.parts.running).toBeNull()
		const expenses = flowItems(edited, "expense", null, null).cards.map((card) => card.id)
		expect(expenses).toContain("home-running")
		expect(expenses).not.toContain("home-buying-cost")
		expect(assetCardsOf(edited, undefined, undefined)[0]?.outside).toEqual(["home-running"])
	})

	test("a change to a share's shape counts too: a derived amount that reads another Account is not recognised", () => {
		const moved = scenarioDocument.parse({
			...doc,
			flows: doc.flows.map((flow) =>
				flow.id === "home-sale" ? { ...flow, derive: { measures: [], result: "none" } } : flow,
			),
		})
		expect(realAssetById(moved, "home")?.outside).toContain("home-sale")
		expect(realAssetById(moved, "home")?.outside).toContain("home-loan-payoff")
	})
})

/** The plan fixture with no routing list naming an Account, so an owned asset can attach to the Baseline's bank. */
function unrouted(): ScenarioDocument {
	return { ...planDocument(), cashflow: { surplus: [], contribute: [], withdraw: [] } }
}

describe("an asset the Baseline holds", () => {
	const choices = ownedChoicesOf(unrouted(), baselineRead())
	const draft = homeDraft({
		ownership: "owned",
		ownedAccount: "bank",
		paying: "savings",
		from: "2027-01-01",
		selling: "none",
	})

	test("is chosen from the Baseline's assets, which are not liabilities", () => {
		expect(choices.map((choice) => choice.id)).toContain("bank")
		expect(choices.map((choice) => choice.id)).not.toContain("loan")
	})

	test("keeps its own id and is marked illiquid, with no purchase, and its card shows the Baseline's value", () => {
		const base = unrouted()
		const parts = partsOf(draft, base, { isNew: true, ownedIds: ["bank"] })
		expect(parts.account).toMatchObject({ id: "bank", liquid: false })
		expect(parts.purchase).toBeNull()
		expect(parts.running?.start).toBe("2027-01-01")
		const next = assetDocument(base, parts, undefined)
		expect(assetCardsOf(next, baselineRead(), undefined)[0]?.baselineValue).toBe("662300.00")
	})

	test("deleting it keeps the Account declared, so the Baseline's balance still has its Account", () => {
		const base = unrouted()
		const parts = partsOf(draft, base, { isNew: true, ownedIds: ["bank"] })
		const removal = withoutAsset(assetDocument(base, parts, undefined), parts, true)
		if (!removal.ok) throw new Error(removal.message)
		expect(removal.document.accounts.find((a) => a.id === "bank")?.liquid).toBeUndefined()
		expect(removal.document.flows.map((f) => f.id)).toEqual(base.flows.map((f) => f.id))
	})

	test("is refused when no Baseline asset is chosen", () => {
		const result = assetFromDraft(
			{ ...draft, ownedAccount: "" },
			{ doc: unrouted(), check: { isNew: true, ownedIds: ["bank"] } },
		)
		expect(result.ok).toBe(false)
	})
})

describe("a refusal lands on the field its path names", () => {
	const layout = assetLayoutOf(doc, "home", false)
	const refusal = (path: string): ErrorBody =>
		({ code: "invalid_input", message: "refused", path, exitCode: 2 }) as unknown as ErrorBody
	const index = doc.flows.findIndex((flow) => flow.id === "home-running")

	test("by index and by id", () => {
		expect(
			fieldOfAssetRefusal(refusal(`document.flows.${index}.derive.measures.1.num`), layout),
		).toBe("running.rate")
		expect(fieldOfAssetRefusal(refusal("flows.home-purchase.amount"), layout)).toBe("price")
		expect(fieldOfAssetRefusal(refusal("flows.home-loan-payment.level.payments"), layout)).toBe(
			"loan.payments",
		)
		expect(fieldOfAssetRefusal(refusal("flows.home-sale.start"), layout)).toBe("saleDate")
		expect(fieldOfAssetRefusal(refusal("accounts.home.rate"), layout)).toBe("valueRate")
		expect(fieldOfAssetRefusal(refusal("accounts.home-loan.rate"), layout)).toBe("loan.rate")
		expect(fieldOfAssetRefusal(refusal(`flows.${index}.derive.measures.1.rounding`), layout)).toBe(
			"rounding",
		)
		expect(fieldOfAssetRefusal(refusal("flows.salary.amount"), layout)).toBeNull()
	})

	test("and shows an unplaced refusal for the whole form", () => {
		const shown = assetShown({}, refusal("flows.salary.amount"), "traj refused it", layout)
		expect(shown.general).toBe("traj refused it")
		const at = assetShown({}, refusal("flows.home-purchase.amount"), "bad price", layout)
		expect(at.at("price")).toBe("bad price")
		expect(at.general).toBeUndefined()
	})
})

describe("naming and deleting", () => {
	test("a second asset with the same name takes the next free id, so none of its items repeat one", () => {
		expect(newAssetId("home", ["home-loan-draw"])).toBe("home-2")
		expect(newAssetId("home", [])).toBe("home")
		const second = partsOf(homeDraft({ name: "Home" }), doc)
		expect(second.account.id).toBe("home-2")
		expect(second.loan?.account.id).toBe("home-2-loan")
	})

	test("deleting removes every item and the loan, and refuses while another Flow reads the asset", () => {
		const parts = realAssetById(doc, "home")?.parts
		if (parts === undefined) throw new Error("no home")
		const removed = withoutAsset(doc, parts, false)
		if (!removed.ok) throw new Error(removed.message)
		expect(removed.document).toEqual(planDocument())
		const reader = scenarioDocument.parse({
			...doc,
			flows: [
				...doc.flows,
				{
					id: "watcher",
					kind: "expense",
					frequency: "monthly",
					start: "2027-01-01",
					derive: {
						measures: [{ id: "value", op: "account", account: "home" }],
						result: "value",
					},
				},
			],
		})
		const refused = withoutAsset(reader, parts, false)
		expect(refused.ok).toBe(false)
		expect(refused.ok === false && refused.message).toContain("watcher")
	})
})
