// A loan changed in the terminal, and a loan the Baseline holds, against the real traj (cli ADR 0059, 0060). A loan
// whose draw the terminal moved is no longer the asset's recognised loan, yet the asset's group claims it, so the
// two never both hold its parts; and a debt the ledger holds has no switch, since its payments out leave it growing.
// Each test makes its own plan, so each passes alone.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { whatIfSession } from "../src/client/what-if.svelte"
import type { ScenarioDocument } from "../src/lib/contract"
import { assetCardsOf } from "../src/lib/view/plan-items/asset-card"
import { assetDocument } from "../src/lib/view/plan-items/asset-document"
import { homeDraft, partsOf } from "../src/lib/view/plan-items/asset-fixtures.test-support"
import { loanCardsOf } from "../src/lib/view/plan-items/loan-card"
import type { GroupSpec } from "../src/lib/what-if/session"
import { settle } from "./editor-running.test-support"
import { forkHash } from "./loans-fork.test-support"
import {
	applyInTerminal,
	baselineOf,
	disposeLedger,
	documentOf,
	hashOf,
	SLOW_MS,
	send,
	setupLedger,
} from "./loans-ledger.test-support"

/** The real fetch: `bun test` runs every file in one process, so a later file must get it back. */
const realFetch = globalThis.fetch
const MOVED = "held-moved"
const MOVED_BACK = "held-moved-back"
const MOVED_SOLD = "held-moved-sold"
const OWED = "held-owed"

beforeAll(() => setupLedger([MOVED, MOVED_BACK, MOVED_SOLD, OWED]), SLOW_MS)
afterAll(async () => {
	whatIfSession.end()
	globalThis.fetch = realFetch
	await disposeLedger()
})

afterEach(settle, SLOW_MS)

/** Starts a session on a plan with no server to read it. */
function newSession(): void {
	whatIfSession.end()
	globalThis.fetch = (() => new Promise<Response>(() => {})) as unknown as typeof fetch
}

/** The plan with a home saved to it, then its loan's draw moved one day in the terminal, as a person editing the file would. */
async function withMovedLoan(plan: string): Promise<ScenarioDocument> {
	const doc = documentOf(plan)
	applyInTerminal(plan, assetDocument(doc, partsOf(homeDraft(), doc), undefined))
	const home = documentOf(plan)
	applyInTerminal(plan, {
		...home,
		flows: home.flows.map((flow) =>
			flow.id === "home-loan-draw" ? { ...flow, start: "2027-07-16" } : flow,
		),
	})
	return documentOf(plan)
}

/**
 * The content hash of the plan the session's changes make: a fork carrying them. The fork runs through
 * `traj scenario fork` alone, with no Snapshot read after it, so each copy costs one write.
 */
function effectiveHash(plan: string, copy: string): string {
	return forkHash(plan, copy, whatIfSession.changesFor(plan))
}

/** The ids of the plan's items that name the home. */
function homeItems(plan: string): string[] {
	const doc = documentOf(plan)
	return [...doc.flows, ...doc.accounts]
		.map((item) => item.id)
		.filter((id) => id.startsWith("home"))
}

type Card = { readonly switch: { readonly spec: GroupSpec; readonly removals: readonly string[] } }

/** Switches each card off in turn in a new session, checks the last takes the first's parts over, removes it, and names the last. */
function switchBothOff(plan: string, hash: string, order: readonly Card[]): string {
	newSession()
	for (const card of order) {
		const { spec, removals } = card.switch
		expect(whatIfSession.setGroupOff(plan, hash, spec, removals, true)).toBe(true)
	}
	const last = order[order.length - 1]?.switch.spec.name ?? ""
	expect(whatIfSession.whatIf?.groups.map((group) => group.name)).toEqual([last])
	const change = whatIfSession.changes.find((one) => one.kind === "group")
	if (change === undefined) throw new Error("no change")
	whatIfSession.removeChange(change)
	return last
}

describe("a loan the terminal changed inside an asset", () => {
	test(
		"has no switch of its own, and the asset's group takes its parts over, in either order",
		async () => {
			const doc = await withMovedLoan(MOVED)
			const hash = hashOf(MOVED)
			const asset = assetCardsOf(doc, baselineOf(), undefined).find((one) => one.id === "home")
			const loan = loanCardsOf(doc, undefined, baselineOf()).find((one) => one.id === "home-loan")
			if (asset === undefined || loan === undefined) throw new Error("no card")
			expect(asset.outside).toContain("home-loan")
			expect(loan.switch.owner?.name).toBe("home")
			expect(loan.switch.refused).toContain("Part of asset home")
			for (const order of [
				[loan, asset],
				[asset, loan],
			]) {
				const last = switchBothOff(MOVED, hash, order)
				expect(whatIfSession.whatIf?.removals ?? []).toEqual([])
				expect(effectiveHash(MOVED, `${MOVED_BACK}-${last}`)).toBe(hash)
			}
		},
		SLOW_MS,
	)

	test(
		"switched off and Applied leaves no home item and no loan behind",
		async () => {
			const doc = await withMovedLoan(MOVED_SOLD)
			const card = assetCardsOf(doc, baselineOf(), undefined).find((one) => one.id === "home")
			if (card === undefined) throw new Error("no home card")
			newSession()
			const { spec, removals } = card.switch
			whatIfSession.setGroupOff(MOVED_SOLD, hashOf(MOVED_SOLD), spec, removals, true)
			const answer = await send({
				kind: "apply-overrides",
				name: MOVED_SOLD,
				contentHash: hashOf(MOVED_SOLD),
				...whatIfSession.changesFor(MOVED_SOLD),
			})
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(homeItems(MOVED_SOLD)).toEqual([])
		},
		SLOW_MS,
	)
})

describe("a loan the Baseline already holds", () => {
	test("has no switch, and says it is already owed", () => {
		const doc = documentOf(OWED)
		const cards = loanCardsOf(doc, undefined, baselineOf())
		const held = cards.find((card) => card.principal !== "" && card.paymentId !== "")
		if (held === undefined) throw new Error("the demo plan has no loan")
		expect(held.switch.refused).toContain("Already owed: the ledger holds this debt")
	})
})
